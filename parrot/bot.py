import logging
from pathlib import Path
from typing import cast

import aiohttp
import asyncio_atexit
import discord
import sqlmodel
from discord.ext import commands, tasks

from parrot.config import settings
from parrot.db.crud import CRUD


class AbstractParrot(commands.AutoShardedBot):
	"""
	Interface kinda thing for the Parrot class that I remembered needing last
	time to prevent circular imports when I introduced dependency injection.
	Maybopefully I won't need do to this again and will be able to delete this
	"""

	crud: CRUD
	http_session: aiohttp.ClientSession
	db_session: sqlmodel.Session


class AbstractParrot(AbstractParrot):
	_destructor_called: bool

	def __init__(self):
		self._destructor_called = False
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
		engine = sqlmodel.create_engine(settings.db_url).execution_options(
			autocommit=False
		)
		self.db_session = sqlmodel.Session(engine)

	async def setup_hook(self) -> None:
		"""Constructor Part 2: Enter Async"""
		self.http_session = aiohttp.ClientSession(loop=self.loop)

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

		# Black magic evil dependency injection
		await self.load_extension("parrot.db.crud")
		self.crud = cast(CRUD, self.cogs["CRUD"])

	async def _async__del__(self) -> None:
		if self._destructor_called:
			logging.debug("_async__del__ called twice")
			return
		self._destructor_called = True
		logging.info("Parrot shutting down...")
		self._autosave.cancel()
		await self.close()  # Log out of Discord
		await self._autosave()
		logging.info("Closing HTTP session...")
		await self.http_session.close()
		logging.info("HTTP session closed.")

	def __del__(self):
		if self._destructor_called:
			logging.debug("__del__ called twice")
			return
		self.db_session.close()
		self.loop.run_until_complete(self._async__del__())

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
