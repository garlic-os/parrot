from enum import Enum

from sqlmodel import Field, SQLModel

from parrot.core.types import Snowflake


class User(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	is_registered: bool = False
	original_avatar_url: str | None
	modified_avatar_url: str | None
	original_avatar_message_id: Snowflake | None = None


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
	timestamp: Snowflake
	content: str


class GuildMeta(Enum):
	default_imitation_prefix = "Not "
	default_imitation_suffix = ""


class Guild(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	imitation_prefix: str = GuildMeta.default_imitation_prefix.value
	imitation_suffix: str = GuildMeta.default_imitation_suffix.value
