import sqlmodel as sm
from parrot.alembic.typess import ISODateString, PModel
from parrot.utils.types import Snowflake


__all__ = ["Message"]


class Message(PModel, table=True):
	id: Snowflake = sm.Field(primary_key=True)
	# This type is different from the one defined in the database at this point
	# in time. This is the type we _want_ the data to be in. Some rows have
	# (datetime) strings already, but some have integers.
	# If SQLAlchemy receives data in a type it doesn't expect, it will just give
	# it to us as is. But it will convert data to the type it believes the
	# column is supposed to have before committing it.
	# So we define this column, for this migration, as the one we intend to
	# convert it all to. That way, it stays that type when we commit it.
	# Also defined as str instead of dt.datetime because we don't want SQLModel
	# to deserialize it.
	# timestamp: ISODateString  # | int

	timestamp: int
	up_timestamp: ISODateString
	...
