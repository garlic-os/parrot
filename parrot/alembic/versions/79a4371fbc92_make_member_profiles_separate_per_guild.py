"""make member profiles separate per guild

Forgets users' old is_registered value; no longer valid because the old value
was global while the new value is guild-specific.
This will unregister everyone, so you'll have to tell them they have to register
again.

Scrapes Discord to populate this table based on what guilds the bot is in and
what users exist in the database being migrated.

Revision ID: 79a4371fbc92
Revises: 7d0ffe4179c6
Create Date: 2025-01-21 14:43:16.104103

"""

import logging
from collections.abc import Sequence

import discord
import sqlalchemy as sa
import sqlmodel as sm
from parrot import config
from parrot.db import GuildMeta
from parrot.utils.types import Snowflake

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "79a4371fbc92"
down_revision: str | None = "7d0ffe4179c6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	class MemberGuildLink(sm.SQLModel, table=True):
		member_id: Snowflake | None = sm.Field(
			default=None, foreign_key="member.id", primary_key=True
		)
		guild_id: Snowflake | None = sm.Field(
			default=None, foreign_key="guild.id", primary_key=True
		)
		is_registered: bool = False
		member: "Member" = sm.Relationship(back_populates="guild_links")  # noqa: F821
		guild: "Guild" = sm.Relationship(back_populates="member_links")  # noqa: F821

	class Guild(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		imitation_prefix: str = GuildMeta.default_imitation_prefix
		imitation_suffix: str = GuildMeta.default_imitation_suffix
		member_links: list[MemberGuildLink] = sm.Relationship(
			back_populates="guild"
		)
		...

	class Member(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		wants_random_wawa: bool = True
		guild_links: list[MemberGuildLink] = sm.Relationship(
			back_populates="member",
			cascade_delete=True,
		)

	op.create_table(
		"memberguildlink",
		sa.Column("member_id", sa.Integer(), nullable=False),
		sa.Column("guild_id", sa.Integer(), nullable=False),
		sa.Column("is_registered", sa.Boolean(), nullable=False),
		sa.ForeignKeyConstraint(["guild_id"], ["guild.id"]),
		sa.ForeignKeyConstraint(["member_id"], ["member.id"]),
		sa.PrimaryKeyConstraint("member_id", "guild_id"),
	)
	op.drop_column("member", "is_registered")

	global target_metadata
	target_metadata = sm.SQLModel.metadata
	session = sm.Session(bind=op.get_bind())

	intents = discord.Intents.default()
	intents.members = True
	client = discord.Client(intents=intents)

	@client.event
	async def on_ready() -> None:
		logging.info("Scraping Discord to populate guild IDs...")
		db_members = session.exec(sm.select(Member)).all()  # noqa: F821
		members_found: set[Snowflake] = set()
		for guild in client.guilds:
			member_ids = (member.id for member in guild.members)
			for db_member in db_members:
				if db_member.id not in member_ids:
					continue
				logging.debug(
					f"User {db_member.id} is a member of guild {guild.id}"
				)
				db_guild = session.get(Guild, guild.id) or Guild(id=guild.id)  # noqa: F821
				session.add(
					MemberGuildLink(  # noqa: F821
						member=db_member,
						guild=db_guild,
					)
				)
				members_found.add(db_member.id)
		for db_member in db_members:
			if db_member.id not in members_found:
				logging.warning(f"Guild not found for user {db_member.id}")
		session.commit()
		await client.close()

	client.run(config.discord_bot_token)

	# If you don't remove these tables from the metadata later migrations will
	# explode
	sm.SQLModel.metadata.remove(Guild.__table__)  # type: ignore
	sm.SQLModel.metadata.remove(Member.__table__)  # type: ignore
	sm.SQLModel.metadata.remove(MemberGuildLink.__table__)  # type: ignore
	del Guild
	del Member
	del MemberGuildLink


def downgrade() -> None:
	op.drop_table("memberguildlink")
	op.add_column(
		"member",
		sa.Column(
			"is_registered",
			sa.Boolean(),
			server_default="0",
			nullable=False,
		),
	)
