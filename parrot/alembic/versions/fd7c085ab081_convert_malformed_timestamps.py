"""convert malformed timestamps

De juris, Parrot v1's message.timestamp column is int (the schema says int).
De facto, it is str | int.
There are three unique forms of data in this column that I have found:
("that I've found" because there are 4 million of them and I didn't read them
all)
1. 0 -- Set when this column was first added long ago to any messages that were
   already present.
2. ISO 8601 date-time string -- Unwittingly began being added in new rows
   sometime after. I guess I thought I was adding int snowflakes.
3. Year number -- no idea.

Well, I'm changing the type now to take advantage of sqlite's DateTime type,
which happens to be the type that most of the rows in the table are now anyway.

This migration scans for integers in the table and overrides them to the Unix
Epoch in DateTime form.
(Actually as an ISO datetime string directly, otherwise SQLAlchemy will
serialize that one dt.datetime 3.999 million times more than is necessary.)

Revision ID: fd7c085ab081
Revises: 1c781052e721
Create Date: 2024-12-20 15:52:45.701284

"""

import datetime as dt
import logging
from collections.abc import Sequence

import pytz
import sqlalchemy as sa
import sqlmodel as sm
from parrot.utils.types import Snowflake
from tqdm import tqdm

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "fd7c085ab081"
down_revision: str | None = "1c781052e721"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UNIX_EPOCH = dt.datetime.fromtimestamp(0).isoformat()
CHUNK_SIZE = 250_000  # With max ~2KB/row, up to ~50MB RAM usage


def datetime2snowflake(datetime: dt.datetime) -> Snowflake:
	"""Convert a python datetime object to a Twitter Snowflake.

	https://github.com/client9/snowflake2time/
	Nick Galbreath @ngalbreath nickg@client9.com
	Uses machine timezone to normalize to UTC
	(Because SQLAlchemy deserializes DateTimes into objects in your timezone)

	:param datetime: datetime (need not be timezone-aware)
	:returns: Twitter Snowflake encoding this time (UTC)
	"""
	timestamp = pytz.utc.localize(datetime).timestamp()
	return (int(round(timestamp * 1000)) - 1288834974657) << 22


def upgrade() -> None:
	from parrot.alembic.models.rfd7c085ab081 import up

	op.add_column(
		"message",
		sa.Column(
			"up_timestamp",
			sa.DateTime(),
			nullable=False,
			server_default=UNIX_EPOCH,
		),
	)

	# sqlalchemy cargo culting
	# https://stackoverflow.com/a/70985446
	# TODO: necessary?
	global target_metadata
	target_metadata = sm.SQLModel.metadata

	session = sm.Session(op.get_bind())

	statement = sa.func.count(up.Message.id)  # type: ignore -- it works
	db_messages_count: int = session.query(statement).scalar()
	logging.info(f"{db_messages_count} messages to scan")
	for i in tqdm(
		range(0, db_messages_count, CHUNK_SIZE),
		total=round(db_messages_count / CHUNK_SIZE),
		unit_scale=CHUNK_SIZE,
	):
		statement = sm.select(up.Message).offset(i).limit(CHUNK_SIZE)
		db_messages_chunk = session.exec(statement)
		for db_message in db_messages_chunk:
			if isinstance(db_message.timestamp, str):
				# Assuming the string is already in the correct format.
				# I'm pretty sure this is always the case, but checking would
				# slow this loop way too far down
				db_message.up_timestamp = db_message.timestamp
			else:
				# logging.debug(
				# 	f"Message {db_message.id} "
				# 	f"malformed timestamp {db_message.timestamp}"
				# )
				db_message.up_timestamp = UNIX_EPOCH
			session.add(db_message)
		session.commit()

	with op.batch_alter_table("message") as batch_op:
		batch_op.drop_column("timestamp")
		batch_op.alter_column("up_timestamp", new_column_name="timestamp")

	sm.SQLModel.metadata.remove(up.Message.__table__)


def downgrade() -> None:
	"""Convert DateTimes to Twitter snowflake timestamps.

	My way of producing something useful out of a downgrade that follows a
	really pretty destructive upgrade
	"""
	from parrot.alembic.models.rfd7c085ab081 import down

	op.add_column(
		"message",
		sa.Column(
			"down_timestamp",
			sa.Integer(),
			nullable=False,
			server_default=str(
				datetime2snowflake(dt.datetime.fromtimestamp(0))
			),
		),
	)

	global target_metadata
	target_metadata = sm.SQLModel.metadata

	session = sm.Session(op.get_bind())

	statement = sa.func.count(down.Message.id)  # type: ignore -- it works
	db_messages_count: int = session.query(statement).scalar()
	logging.info(f"{db_messages_count} messages to convert")
	for i in tqdm(
		range(0, db_messages_count, CHUNK_SIZE),
		total=round(db_messages_count / CHUNK_SIZE),
		unit_scale=CHUNK_SIZE,
	):
		statement = sm.select(down.Message).offset(i).limit(CHUNK_SIZE)
		db_messages_chunk = session.exec(statement)
		for db_message in db_messages_chunk:
			db_message.down_timestamp = datetime2snowflake(db_message.timestamp)
			session.add(db_message)
		session.commit()

	with op.batch_alter_table("message") as batch_op:
		batch_op.drop_column("timestamp")
		batch_op.alter_column("down_timestamp", new_column_name="timestamp")

	sm.SQLModel.metadata.remove(down.Message.__table__)
