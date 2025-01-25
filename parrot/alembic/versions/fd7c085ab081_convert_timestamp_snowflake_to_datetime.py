"""convert timestamp snowflake to datetime

Technically destructive but whatever. Doesn't preserve whether timestamp was an
int or a str, so the downgrade function will always convert columns to ints,
even if the column was originally a str. Really should be an int anyway, though,
and at the end of the day it doesn't really matter because this column isn't
even used by Parrot directly, it's for record-keeping. I need to go to bed

Revision ID: fd7c085ab081
Revises: 1c781052e721
Create Date: 2024-12-20 15:52:45.701284

"""

import datetime as dt
from collections.abc import Sequence
from typing import cast

import pytz
import sqlalchemy as sa
import sqlmodel as sm
from parrot.alembic.typess import ISODateString
from parrot.utils.types import Snowflake

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "fd7c085ab081"
down_revision: str | None = "1c781052e721"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def datetime2snowflake(datetime: dt.datetime) -> Snowflake:
	"""
	Convert a python datetime object to a Twitter Snowflake.

	https://github.com/client9/snowflake2time/
	Nick Galbreath @ngalbreath nickg@client9.com
	Uses machine timezone to normalize to UTC

	:param datetime: datetime (need not be timezone-aware)
	:returns: Twitter Snowflake encoding this time (UTC)
	"""
	timestamp = pytz.utc.localize(datetime).timestamp()
	return (int(round(timestamp * 1000)) - 1288834974657) << 22


def snowflake2datetime(snowflake: Snowflake) -> dt.datetime:
	"""
	:param snowflake: Twitter Snowflake (UTC)
	:returns: datetime (UTC)
	"""
	timestamp = ((snowflake >> 22) + 1288834974657) / 1000.0
	return dt.datetime.fromtimestamp(timestamp, tz=dt.UTC)


def to_datetime(column: Snowflake | ISODateString) -> dt.datetime:
	if isinstance(column, str):
		return dt.datetime.fromisoformat(column)
	return snowflake2datetime(column)


def upgrade() -> None:
	class Message(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		...
		timestamp: Snowflake  # | ISODateString  # see v1_schema.py
		up_timestamp: dt.datetime

	# Create a new timestamp column with the upgrade type (dt.datetime)
	with op.batch_alter_table("message") as batch_op:
		batch_op.add_column(
			sa.Column(
				"up_timestamp",
				sa.DateTime(),
				nullable=False,
				server_default=snowflake2datetime(0).isoformat(),
			)
		)

	# sqlalchemy cargo culting
	# https://stackoverflow.com/a/70985446
	# TODO: necessary?
	global target_metadata
	target_metadata = sm.SQLModel.metadata

	session = sm.Session(bind=op.get_bind())

	# Convert the current timestamp to the upgrade type
	db_messages = session.exec(sm.select(Message)).all()
	for message in db_messages:
		message.up_timestamp = to_datetime(
			cast(Snowflake | ISODateString, message.timestamp)
		)
	session.add_all(db_messages)

	# Drop the old column and rename the new one
	op.drop_column("message", "timestamp")
	op.alter_column("message", "up_timestamp", new_column_name="timestamp")

	# Remove this table from the metadata otherwise later migrations will
	# explode
	sm.SQLModel.metadata.remove(Message.__table__)  # type: ignore


def downgrade() -> None:
	class Message(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		...
		timestamp: dt.datetime
		down_timestamp: Snowflake

	# Create a new timestamp column with the downgrade type
	# (Twitter Snowflake format int)
	op.add_column(
		"message",
		sa.Column(
			"down_timestamp", sa.BigInteger, server_default="0", nullable=False
		),
	)

	global target_metadata
	target_metadata = sm.SQLModel.metadata
	session = sm.Session(bind=op.get_bind())

	# Convert the current timestamp to the downgrade type
	db_messages = session.exec(sm.select(Message)).all()
	for message in db_messages:
		message.down_timestamp = datetime2snowflake(message.timestamp)
	session.add_all(db_messages)

	# Drop the old column and rename the new one
	op.drop_column("message", "timestamp")
	op.alter_column("message", "down_timestamp", new_column_name="timestamp")

	sm.SQLModel.metadata.remove(Message.__table__)  # type: ignore
