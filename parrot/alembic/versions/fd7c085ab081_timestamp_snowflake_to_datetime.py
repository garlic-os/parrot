"""timestamp snowflake to datetime

Revision ID: fd7c085ab081
Revises: 21069c329505
Create Date: 2024-12-20 15:52:45.701284

"""

import datetime as dt
from collections.abc import Sequence

import pytz
import sqlalchemy as sa
import sqlmodel as sm
from parrot.utils.types import Snowflake

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "fd7c085ab081"
down_revision: str | None = "21069c329505"
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


def upgrade() -> None:
	sm.SQLModel.__table_args__ = {"extend_existing": True}

	class Message(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		...
		timestamp: Snowflake
		up_timestamp: dt.datetime

	# Create a new timestamp column with the upgrade type (dt.datetime)
	op.add_column("message", sa.Column("up_timestamp", sa.DateTime, nullable=False))

	# sqlalchemy cargo culting
	# https://stackoverflow.com/a/70985446
	# TODO: necessary?
	global target_metadata
	target_metadata = sm.SQLModel.metadata

	session = sm.Session(bind=op.get_bind())

	# Convert the current timestamp to the upgrade type
	db_messages = session.exec(sm.select(Message)).all()
	for message in db_messages:
		message.up_timestamp = snowflake2datetime(message.timestamp)
		session.add(message)
	session.commit()

	# Drop the old column and rename the new one
	op.drop_column("message", "timestamp")
	op.alter_column("message", "up_timestamp", new_column_name="timestamp")


def downgrade() -> None:
	sm.SQLModel.__table_args__ = {"extend_existing": True}

	class Message(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		...
		timestamp: dt.datetime
		down_timestamp: Snowflake

	# Create a new timestamp column with the downgrade type
	# (Twitter Snowflake format int)
	op.add_column("message", sa.Column("down_timestamp", sa.BigInteger, nullable=False))

	global target_metadata
	target_metadata = sm.SQLModel.metadata

	session = sm.Session(bind=op.get_bind())

	# Convert the current timestamp to the downgrade type
	db_messages = session.exec(sm.select(Message)).all()
	for message in db_messages:
		message.down_timestamp = datetime2snowflake(message.timestamp)
		session.add(message)
	session.commit()

	# Drop the old column and rename the new one
	op.drop_column("message", "timestamp")
	op.alter_column("message", "down_timestamp", new_column_name="timestamp")
