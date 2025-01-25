"""add channel and message guild id

Adds key guild_id to tables channel and message,
Adds indices to message.guild_id + author_id.

Scrapes these guild IDs from Discord.

Revision ID: 7d0ffe4179c6
Revises: 2e2045b63d7a
Create Date: 2025-01-21 14:40:18.601522

"""

import asyncio
import datetime as dt
import logging
from collections.abc import Sequence

import discord
import sqlalchemy as sa
import sqlmodel as sm
from parrot import config
from parrot.db import GuildMeta
from parrot.utils import cast_not_none
from parrot.utils.types import Snowflake

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7d0ffe4179c6"
down_revision: str | None = "2e2045b63d7a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	# Minimal SQLModel setup to complete this migration
	# Any table referred to in a foreign key must be present too
	class Channel(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		can_speak_here: bool = False
		can_learn_here: bool = False
		webhook_id: Snowflake | None = None
		# New
		guild_id: Snowflake = sm.Field(foreign_key="guild.id")

	class Guild(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		imitation_prefix: str = GuildMeta.default_imitation_prefix
		imitation_suffix: str = GuildMeta.default_imitation_suffix
		...

	class Member(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		wants_random_wawa: bool = True
		...

	class Message(sm.SQLModel, table=True):
		id: Snowflake = sm.Field(primary_key=True)
		timestamp: dt.datetime
		content: str
		author_id: Snowflake = sm.Field(foreign_key="member.id")
		# New
		guild_id: Snowflake = sm.Field(foreign_key="guild.id")
		__table_args__ = (
			sa.Index("ix_guild_id_author_id", "guild_id", "author_id"),
		)

	with op.batch_alter_table("channel") as batch_op:
		# https://stackoverflow.com/a/6710280
		# sqlite oversight: You have to add the column with a default value then
		# remove the default value after for it to work
		batch_op.add_column(
			sa.Column(
				"guild_id", sa.Integer(), nullable=False, server_default="0"
			)
		)
	with op.batch_alter_table("channel") as batch_op:
		batch_op.alter_column("guild_id", server_default=None)
		batch_op.create_foreign_key(None, "guild", ["guild_id"], ["id"])

	with op.batch_alter_table("message") as batch_op:
		batch_op.add_column(
			sa.Column(
				"guild_id",
				sa.Integer(),
				nullable=False,
				# Temporary default
				server_default="0",
			)
		)
		batch_op.create_foreign_key(None, "guild", ["guild_id"], ["id"])
		batch_op.create_index(
			op.f("ix_guild_id_author_id"), ["guild_id", "author_id"]
		)

	global target_metadata
	target_metadata = sm.SQLModel.metadata
	session = sm.Session(bind=op.get_bind())

	client = discord.Client(intents=discord.Intents.default())

	@client.event
	async def on_ready() -> None:
		logging.info("Scraping Discord to populate guild IDs...")

		async def process_channel(db_channel: Channel) -> None:
			try:
				channel = await client.fetch_channel(db_channel.id)
			except Exception as exc:
				logging.warning(
					f"Failed to fetch channel {db_channel.id}: {exc}"
				)
				return
			if not isinstance(channel, discord.TextChannel):
				logging.warning(
					"Invalid channel type: "
					f"{db_channel.id} is {type(channel)}. "
					"Defaulting channel.guild_id to 0"
				)
				return
			db_channel.guild_id = channel.guild.id
			logging.debug(
				f"Channel {db_channel.id} in guild {db_channel.guild_id}"
			)
			session.add(db_channel)

		db_channels = session.exec(sm.select(Channel)).all()
		logging.debug(f"{len(db_channels)} channels to process")
		async with asyncio.TaskGroup() as tg:
			for db_channel in db_channels:
				tg.create_task(process_channel(db_channel))

		async def fetch_message(db_message: Message) -> discord.Message | None:
			for guild in client.guilds:
				for channel in guild.channels:
					if not isinstance(channel, discord.TextChannel):
						continue
					try:
						return await channel.fetch_message(db_message.id)
					except discord.NotFound:
						continue
					except discord.Forbidden:
						continue
					except Exception as exc:
						logging.warning(
							"Unexpected error while attempting to fetch "
							f"message {db_message.id}: {exc}"
						)
						continue

		async def process_message(db_message: Message) -> None:
			message = await fetch_message(db_message)
			if message is None:
				logging.warning(
					"Orphaned message: "
					f"could not find source guild for ID {db_message.id}. "
					"Defaulting message.guild_id to 0"
				)
				return
			# message.guild guaranteed to exist because we got it from a guild
			db_message.guild_id = cast_not_none(message.guild).id
			logging.debug(
				f"Message {db_message.id} in guild {db_message.guild_id}"
			)
			session.add(db_message)

		db_messages = session.exec(sm.select(Message)).all()
		logging.debug(f"{len(db_messages)} messages to process")
		async with asyncio.TaskGroup() as tg:
			for db_message in db_messages:
				tg.create_task(process_message(db_message))

		session.commit()
		await client.close()

	client.run(config.discord_bot_token)

	# Remove temporary default value setting from message.guild_id now that they
	# should have all been populated
	with op.batch_alter_table("message") as batch_op:
		batch_op.alter_column("guild_id", server_default=None)

	# If you don't remove these tables from the metadata later migrations will
	# explode
	sm.SQLModel.metadata.remove(Channel.__table__)  # type: ignore
	sm.SQLModel.metadata.remove(Guild.__table__)  # type: ignore
	sm.SQLModel.metadata.remove(Member.__table__)  # type: ignore
	sm.SQLModel.metadata.remove(Message.__table__)  # type: ignore
	# No like actually completely delete them or sqlalchemy will hold onto a
	# weakref of them
	# I know this trips your type checker and I'm sorry
	del Channel
	del Guild
	del Member
	del Message


def downgrade() -> None:
	with op.batch_alter_table("channel") as batch_op:
		batch_op.drop_constraint(
			op.f("fk_channel_guild_id_guild"), type_="foreignkey"
		)
		batch_op.drop_column("guild_id")

	with op.batch_alter_table("message") as batch_op:
		batch_op.drop_constraint(
			op.f("fk_message_guild_id_guild"), type_="foreignkey"
		)
		batch_op.drop_column("guild_id")
