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
from parrot.utils.types import Snowflake
from tqdm import tqdm

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "79a4371fbc92"
down_revision: str | None = "7d0ffe4179c6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	# Imported here so the models inside aren't added to the global namespace
	from parrot.alembic.models import r79a4371fbc92

	conn = op.get_bind()
	r79a4371fbc92.MemberGuildLink.__table__.create(conn)
	op.drop_column("member", "is_registered")

	global target_metadata
	target_metadata = sm.SQLModel.metadata
	session = sm.Session(bind=conn)

	intents = discord.Intents.default()
	intents.members = True
	client = discord.Client(intents=intents)

	@client.event
	async def on_ready() -> None:
		logging.info("Scraping Discord to populate guild IDs...")
		db_members = session.exec(sm.select(r79a4371fbc92.Member)).all()
		members_found: set[Snowflake] = set()
		for guild in tqdm(client.guilds, desc="Guilds processed"):
			member_ids = (member.id for member in guild.members)
			# for db_member in tqdm(db_members):
			for db_member in db_members:
				if db_member.id not in member_ids:
					continue
				# logging.debug(
				# 	f"User {db_member.id} is a member of guild {guild.id}"
				# )
				db_guild = session.get(
					r79a4371fbc92.Guild, guild.id
				) or r79a4371fbc92.Guild(id=guild.id)
				session.add(
					r79a4371fbc92.MemberGuildLink(
						member=db_member,
						guild=db_guild,
					)
				)
				members_found.add(db_member.id)
		for db_member in db_members:
			if db_member.id not in members_found:
				logging.warning(f"No guilds found for user {db_member.id}")
		session.commit()
		await client.close()

	client.run(config.discord_bot_token)

	sm.SQLModel.metadata.remove(r79a4371fbc92.Guild.__table__)
	sm.SQLModel.metadata.remove(r79a4371fbc92.Member.__table__)
	sm.SQLModel.metadata.remove(r79a4371fbc92.MemberGuildLink.__table__)


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
