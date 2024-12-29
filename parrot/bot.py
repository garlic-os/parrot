import logging
from pathlib import Path

import asyncio_atexit
import discord
import sqlmodel as sm
from discord.ext import commands, tasks

from parrot.config import settings
from parrot.db.crud import CRUD
from parrot.db.manager.antiavatar import AntiavatarManager
from parrot.db.manager.markov_model import MarkovModelManager
from parrot.db.manager.webhook import WebhookManager


class Parrot(commands.AutoShardedBot):
	db_session: sm.Session
	crud: CRUD
	markov_models: MarkovModelManager
	antiavatars: AntiavatarManager
	webhooks: WebhookManager

	def __init__(self):
		logging.info(f"discord.py {discord.__version__}")

		intents = discord.Intents.default()
		intents.message_content = True
		intents.members = settings.enable_imitate_someone

		super().__init__(
			command_prefix=settings.command_prefix,
			intents=intents,
			owner_ids=settings.admin_user_ids,
			allowed_mentions=discord.AllowedMentions.none(),
			activity=discord.Activity(
				type=discord.ActivityType.listening,
				name=f"everyone ({settings.command_prefix}help)",
			),
			case_insensitive=True,
		)
		engine = sm.create_engine(settings.db_url).execution_options(
			autocommit=False
		)
		self.db_session = sm.Session(engine)
		self.crud = CRUD(self)
		self.markov_models = MarkovModelManager(self.crud)
		self.webhooks = WebhookManager(self)

	async def setup_hook(self) -> None:
		"""Constructor Part 2: Enter Async"""
		# Parrot has to do async stuff as part of its destructor, so it can't
		# actually use __del__, a method strictly synchronous. So we have to
		# reinvent a little bit of the wheel and manually set a function to run
		# when Parrot is about to be destroyed -- except slightly earlier, while
		# the event loop is still up.
		asyncio_atexit.register(self._async__del__, loop=self.loop)

		self._autosave.start()
		await self.load_extension("jishaku")
		await self.load_extension_folder("event_listeners")
		await self.load_extension_folder("commands")

		self.antiavatars = await AntiavatarManager.new(self)

	async def _async__del__(self) -> None:
		logging.info("Parrot shutting down...")
		self.db_session.close()
		self._autosave.cancel()
		await self.close()  # Log out of Discord
		await self._autosave()

	async def load_extension_folder(self, path: str) -> None:
		for entry in (Path("parrot") / path).iterdir():
			if not entry.is_file():
				continue
			if entry.name == "__init__.py":
				continue
			fqn = f"parrot.{path}.{entry.stem}"
			try:
				logging.info(f"Loading {fqn}... ")
				await self.load_extension(fqn)
				logging.info("✅")
			except Exception as error:
				logging.info("❌")
				logging.error(f"{error}\n")

	@tasks.loop(seconds=settings.autosave_interval_seconds)
	async def _autosave(self) -> None:
		"""Commit the database on a timer.
		Far more performant than committing on every query."""
		logging.info("Saving to database...")
		self.db_session.commit()
		logging.info("Save complete.")

	def go(self) -> None:
		"""The next logical step after `start` and `run`"""
		self.run(settings.discord_bot_token)
