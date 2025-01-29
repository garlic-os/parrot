import datetime as dt

import sqlmodel as sm
from parrot.alembic.typess import PModel
from parrot.utils.types import Snowflake


__all__ = ["Message"]


class Message(PModel, table=True):
	id: Snowflake = sm.Field(primary_key=True)
	timestamp: dt.datetime
	down_timestamp: Snowflake
	...
