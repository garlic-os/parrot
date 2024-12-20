import datetime as dt
from enum import Enum

from sqlmodel import Field, SQLModel

from parrot.core.types import Snowflake


class Channel(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)

	# TODO: Migration for this!!!!!
	guild_id: Snowflake = Field(foreign_key="Guild.id")

	can_speak_here: bool = False
	can_learn_here: bool = False
	webhook_id: Snowflake | None = None


class Message(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	user_id: Snowflake = Field(foreign_key="User.id")

	# TODO: Migration for this too!!!!
	guild_id: Snowflake = Field(foreign_key="Guild.id")

	timestamp: dt.datetime  # TODO: migrationg Snowflake → datetime
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
	# is_registered: bool = False  # TODO: mfmmmgmgration delete this
	# original_avatar_url: str | None  # TODO: migration delete these too
	# modified_avatar_url: str | None
	# original_avatar_message_id: Snowflake | None = None
	wants_random_devolve: bool = True

# TODO: rahhhhhh migration!!!!!
class Registration(SQLModel, table=True):
	guild_id: Snowflake = Field(foreign_key="Guild.id")
	user_id: Snowflake = Field(foreign_key="User.id")

	# this user information moved to server-specific table now that avatars can
	# be server-specific
	# TODO: optimize for users who don't use server-specific avatars
	original_avatar_url: str | None
	modified_avatar_url: str | None
	original_avatar_message_id: Snowflake | None = None
