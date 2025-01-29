"""add channel and message guild id

Adds key guild_id to tables channel and message,
Adds indices to message.guild_id + author_id.

Scrapes these guild IDs from Discord.

Revision ID: 7d0ffe4179c6
Revises: 2e2045b63d7a
Create Date: 2025-01-21 14:40:18.601522

"""

import asyncio
import logging
from collections.abc import Sequence

import discord
import sqlalchemy as sa
import sqlmodel as sm
from parrot import config
from parrot.utils import cast_not_none, executor_function
from tqdm import tqdm

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7d0ffe4179c6"
down_revision: str | None = "2e2045b63d7a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CHUNK_SIZE = 500


def upgrade() -> None:
	from parrot.alembic.models import r7d0ffe4179c6

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

		async def process_channel(db_channel: r7d0ffe4179c6.Channel) -> None:
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

		async def fetch_message(
			db_message: r7d0ffe4179c6.Message,
		) -> discord.Message | None:
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

		async def process_message(db_message: r7d0ffe4179c6.Message) -> None:
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

		db_channels = session.exec(sm.select(r7d0ffe4179c6.Channel)).all()
		logging.debug(f"{len(db_channels)} channels to process")
		async with asyncio.TaskGroup() as tg:
			for db_channel in tqdm(db_channels):
				tg.create_task(process_channel(db_channel))
		session.add_all(db_channels)

		# Message count can be huge, so we have to work in chunks unless we
		# want to risk running out of memory making 4,000,000 Message objects
		# COUNT() query from https://stackoverflow.com/a/47801739
		statement = sa.func.count(r7d0ffe4179c6.Message.id)  # type: ignore  -- it works
		db_messages_count: int = session.query(statement).scalar()
		logging.debug(f"{db_messages_count} messages to process")
		for i in tqdm(
			range(0, db_messages_count, CHUNK_SIZE),
			total=round(db_messages_count / CHUNK_SIZE),
			unit_scale=CHUNK_SIZE,
		):
			statement = (
				sm.select(r7d0ffe4179c6.Message).offset(i).limit(CHUNK_SIZE)
			)
			db_messages_chunk = session.exec(statement).all()
			async with asyncio.TaskGroup() as tg:
				for db_message in db_messages_chunk:
					tg.create_task(process_message(db_message))
			session.add_all(db_messages_chunk)
			session.commit()
		await client.close()

	client.run(config.discord_bot_token)

	# Remove temporary default value setting from message.guild_id now that they
	# should have all been populated
	with op.batch_alter_table("message") as batch_op:
		batch_op.alter_column("guild_id", server_default=None)

	sm.SQLModel.metadata.remove(r7d0ffe4179c6.Channel.__table__)
	sm.SQLModel.metadata.remove(r7d0ffe4179c6.Guild.__table__)
	sm.SQLModel.metadata.remove(r7d0ffe4179c6.Member.__table__)
	sm.SQLModel.metadata.remove(r7d0ffe4179c6.Message.__table__)


def downgrade() -> None:
	try:
		with op.batch_alter_table("channel") as batch_op:
			batch_op.drop_constraint(
				op.f("fk_channel_guild_id_guild"), type_="foreignkey"
			)
			batch_op.drop_index(op.f("ix_guild_id_author_id"))
	except ValueError as exc:
		logging.warning(exc)
	with op.batch_alter_table("channel") as batch_op:
		batch_op.drop_column("guild_id")

	with op.batch_alter_table("message") as batch_op:
		batch_op.drop_constraint(
			op.f("fk_message_guild_id_guild"), type_="foreignkey"
		)
		batch_op.drop_column("guild_id")
