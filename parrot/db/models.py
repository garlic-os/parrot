"""
Parrot's database models, using SQLModel.

This is essentially a local cache of data from the Discord API that Parrot
relies on, plus some of Parrot's own information.

N.B. The primary keys on tables that are direct analogs to Discord entities
(e.g., Channel, Message) are intentionally _not_ created automatically by the
database, and are expected to be the same as their IDs from Discord.
"""

# TODO: with markovify.Text.combine(), is regenerating necessary anymore, except
# for infrequent things like message edits and deletes? Can models instead be
# kept (serialized or pickled) always and only in the database?

# TODO: understand .commit() and .refresh()/see if there are any occurrences of
# them that can be deleted

# TODO: prune unused Relationships and back-populations

import datetime as dt

from sqlmodel import Field, Relationship, SQLModel

from parrot.utils.types import Snowflake


class Channel(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	can_speak_here: bool = False
	can_learn_here: bool = False
	webhook_id: Snowflake | None = None
	guild_id: Snowflake = Field(foreign_key="guild.id")

	guild: "Guild" = Relationship(back_populates="channels")


class Message(SQLModel, table=True):
	# not the primary key; Parrot should really get Messages through
	# Member-Guild associations. Still good to have though.
	id: Snowflake
	timestamp: dt.datetime
	content: str

	# TODO: migration -- member_id → author_id
	# TODO: migration -- author_id and guild_id made primary keys
	author_id: Snowflake = Field(foreign_key="member.id", primary_key=True)

	guild_id: Snowflake = Field(foreign_key="guild.id", primary_key=True)

	author: "Member" = Relationship(back_populates="messages")
	guild: "Guild" = Relationship(back_populates="messages")


class MemberGuildLink(SQLModel, table=True):
	# TODO: migration - remove id, make both member_id and guild_id primary
	member_id: Snowflake = Field(foreign_key="member.id", primary_key=True)
	guild_id: Snowflake = Field(foreign_key="guild.id", primary_key=True)
	is_registered: bool = False

	member: "Member" = Relationship(back_populates="guild_links")
	guild: "Guild" = Relationship(back_populates="member_links")
	avatar_info: "AvatarInfo" = Relationship()


class Member(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	wants_random_devolve: bool = True

	# TODO: migration -- add ON DELETE rules
	guild_links: list[MemberGuildLink] = Relationship(back_populates="member", cascade_delete=True)
	messages: list[Message] = Relationship(back_populates="author", cascade_delete=True)
	avatars: list["AvatarInfo"] = Relationship(back_populates="member", cascade_delete=True)


class GuildMeta:
	"""Extracted out so these can be used on their own elsewhere"""

	default_imitation_prefix = "Not "
	default_imitation_suffix = ""


class Guild(SQLModel, table=True):
	id: Snowflake = Field(primary_key=True)
	imitation_prefix: str = GuildMeta.default_imitation_prefix
	imitation_suffix: str = GuildMeta.default_imitation_suffix

	member_links: list[MemberGuildLink] = Relationship(back_populates="guild")
	channels: list[Channel] = Relationship(back_populates="guild")
	avatars: list["AvatarInfo"] = Relationship(back_populates="guild")
	messages: list[Message] = Relationship(back_populates="guild")


# A separate table from MemberGuildLink to group them as one
# None-or-not-None unit
class AvatarInfoBase(SQLModel):
	original_avatar_url: str
	antiavatar_url: str
	antiavatar_message_id: Snowflake


class AvatarInfo(AvatarInfoBase, table=True):
	# TODO: migration - remove id, make both member_id and guild_id primary
	member_id: Snowflake = Field(foreign_key="member.id", primary_key=True)
	guild_id: Snowflake = Field(foreign_key="guild.id", primary_key=True)

	member: Member = Relationship(back_populates="avatars")
	guild: Guild = Relationship(back_populates="avatars")


class AvatarInfoCreate(AvatarInfoBase):
	pass
