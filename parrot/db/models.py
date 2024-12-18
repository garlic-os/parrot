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
	can_speak_here: bool = False
	can_learn_here: bool = False
	webhook_id: Snowflake | None = None


class Message(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	user_id: Snowflake = Field(foreign_key="User.id")
	timestamp: Snowflake
	content: str


class Guild(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	imitation_prefix: str = "Not "
	imitation_suffix: str = ""
