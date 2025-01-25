"""convert malformed timestamps

Some message timestamps in Parrot v1's database are the integer 0 instead of a
an ISO 8601 date string (which SQLModel deserializes into dt.datetimes) as they
should be. This identifies any 0 timestamp and overrides it to the Unix epoch.

Revision ID: fd7c085ab081
Revises: 1c781052e721
Create Date: 2024-12-20 15:52:45.701284

"""

import datetime as dt
from collections.abc import Sequence

import sqlmodel as sm
from parrot.alembic.typess import ISODateString
from parrot.utils.types import Snowflake

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "fd7c085ab081"
down_revision: str | None = "1c781052e721"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UNIX_EPOCH = dt.datetime.fromtimestamp(0).isoformat()


def upgrade() -> None:
	class Message(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		# Defining as str instead of dt.datetime because we don't need SQLModel
		# to deserialize it
		timestamp: ISODateString  # | Literal[0]
		...

	# sqlalchemy cargo culting
	# https://stackoverflow.com/a/70985446
	# TODO: necessary?
	global target_metadata
	target_metadata = sm.SQLModel.metadata

	session = sm.Session(bind=op.get_bind())

	statement = sm.select(Message).where(Message.timestamp == 0)
	malformed = session.exec(statement).all()
	for db_message in malformed:
		db_message.timestamp = UNIX_EPOCH
		session.add(db_message)

	# Remove this table from the metadata otherwise later migrations will
	# explode
	sm.SQLModel.metadata.remove(Message.__table__)  # type: ignore
	del Message


def downgrade() -> None:
	pass
