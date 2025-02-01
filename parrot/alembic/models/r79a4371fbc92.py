import sqlmodel as sm
from parrot.alembic.typess import PModel
from parrot.db import GuildMeta
from parrot.utils.types import Snowflake


class Member(PModel, table=True):
	id: Snowflake = sm.Field(primary_key=True)
	wants_random_wawa: bool = True
	guild_links: list["MemberGuildLink"] = sm.Relationship(
		back_populates="member",
		cascade_delete=True,
	)
	...


class Guild(PModel, table=True):
	id: Snowflake = sm.Field(primary_key=True)
	imitation_prefix: str = GuildMeta.default_imitation_prefix
	imitation_suffix: str = GuildMeta.default_imitation_suffix
	member_links: list["MemberGuildLink"] = sm.Relationship(
		back_populates="guild"
	)
	...


class MemberGuildLink(PModel, table=True):
	member_id: Snowflake | None = sm.Field(
		default=None, foreign_key="member.id", primary_key=True
	)
	guild_id: Snowflake | None = sm.Field(
		default=None, foreign_key="guild.id", primary_key=True
	)
	is_registered: bool = False
	member: Member = sm.Relationship(back_populates="guild_links")
	guild: Guild = sm.Relationship(back_populates="member_links")
