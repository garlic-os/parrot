"""
Database schema for Parrot v1 as defined here:
https://github.com/garlic-os/parrot/blob/53a95b8/bot.py#L56-L82

Preserved for migrations
"""

from parrot.alembic.typess import ISODateString
from parrot.db import NAMING_CONVENTION
from parrot.utils.types import Snowflake
from sqlmodel import Field, SQLModel


SQLModel.metadata.naming_convention = NAMING_CONVENTION


class Channels(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	can_speak_here: bool = False
	can_learn_here: bool = False
	webhook_id: Snowflake | None


class Guilds(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	imitation_prefix: str = "Not "
	imitation_suffix: str = ""


class Messages(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	user_id: Snowflake = Field(foreign_key="users.id")
	# This col's type is defined as int (timestamp snowflake), but apparently
	# Parrot v1 was actually putting ISO 8601 date strings in it already.
	# Didn't know that lol. sqlite never complained
	# But there are still many rows that are ints too.
	# But But! I can't actually type annotate this because Cannot Have A Union
	# As A SQLAlchemy Field. Say that to this columns face SQLAlchemy.
	timestamp: Snowflake  # | ISODateString
	content: str


class Users(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	is_registered: bool = False
	original_avatar_url: str | None
	modified_avatar_url: str | None
	modified_avatar_message_id: Snowflake | None
