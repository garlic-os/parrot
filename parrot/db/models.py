"""
Parrot's database models, using SQLModel.

This is essentially a local cache of data from the Discord API that Parrot
relies on, plus some of Parrot's own information.

N.B. The primary keys on tables that are direct analogs to Discord entities
(e.g., Channel, Message) are intentionally _not_ created automatically by the
database, and are expected to be the same as their IDs from Discord.
Primary keys of Parrot-proprietary tables are autoincremented.
"""

import datetime as dt
from enum import Enum

from sqlmodel import Field, SQLModel

from parrot.core.types import Snowflake


class Channel(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	guild_id: Snowflake = Field(foreign_key="Guild.id")
	can_speak_here: bool = False
	can_learn_here: bool = False
	webhook_id: Snowflake | None = None


class Message(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	user_id: Snowflake = Field(foreign_key="User.id")
	guild_id: Snowflake = Field(foreign_key="Guild.id")
	timestamp: dt.datetime
	content: str


class GuildMeta(Enum):
	"""Extracted out so these can be used on their own elsewhere"""

	default_imitation_prefix = "Not "
	default_imitation_suffix = ""


class Guild(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	imitation_prefix: str = GuildMeta.default_imitation_prefix.value
	imitation_suffix: str = GuildMeta.default_imitation_suffix.value


class User(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	wants_random_devolve: bool = True


class Registration(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True, default=None)  # sql autoincrement
	guild_id: Snowflake = Field(foreign_key="Guild.id")
	user_id: Snowflake = Field(foreign_key="User.id")
	original_avatar_url: str | None = None
	modified_avatar_url: str | None = None
	modified_avatar_message_id: Snowflake | None = None
