from typing import List, Optional, Set, Union
from discord import (
    Activity, ActivityType, AllowedMentions, ChannelType, Message, Intents
)
import discord
from discord.ext import commands
from discord.ext import tasks
import sqlite3

import asyncio_atexit
import config
import os
import logging
import aiohttp
from functools import lru_cache
from utils.parrot_markov import ParrotMarkov
from utils.exceptions import NoDataError
from utils import regex
from database.corpus_manager import CorpusManager
from database.avatar_manager import AvatarManager


class Parrot(commands.AutoShardedBot):
    def __init__(
        self, *,
        prefix: str,
        db_path: str,
        admin_user_ids: List[int],
        admin_role_ids: Optional[List[int]]=None,
    ):
        logging.info(f"discord.py v{discord.__version__}")
        intents = Intents.default()
        intents.message_content = True

        super().__init__(
            command_prefix=prefix,
            owner_ids=admin_user_ids,
            case_insensitive=True,
            allowed_mentions=AllowedMentions.none(),
            activity=Activity(
                name=f"everyone ({prefix}help)",
                type=ActivityType.listening,
            ),
            intents=intents,
        )

        self.admin_role_ids = admin_role_ids or []
        self.finished_initializing = False
        self.destructor_called = False
        self.con = sqlite3.connect(db_path)
        self.db = self.con.cursor()

        self.db.executescript(
            """
            BEGIN;
            CREATE TABLE IF NOT EXISTS users (
                id                         INTEGER PRIMARY KEY,
                is_registered              INTEGER NOT NULL DEFAULT 0,
                original_avatar_url        TEXT,
                modified_avatar_url        TEXT,
                modified_avatar_message_id INTEGER
            );

            CREATE TABLE IF NOT EXISTS channels (
                id             INTEGER PRIMARY KEY,
                can_speak_here INTEGER NOT NULL DEFAULT 0,
                can_learn_here INTEGER NOT NULL DEFAULT 0,
                webhook_id     INTEGER
            );

            CREATE TABLE IF NOT EXISTS messages (
                id        INTEGER PRIMARY KEY,
                user_id   INTEGER NOT NULL REFERENCES users(id),
                timestamp INTEGER NOT NULL,
                content   TEXT    NOT NULL
            );
            COMMIT;
            """
        )

        self.update_learning_channels()
        self.update_speaking_channels()
        self.update_registered_users()


    async def _async__del__(self) -> None:
        if self.destructor_called:
            return
        self.destructor_called = True
        logging.info("Parrot shutting down...")
        self.autosave.cancel()
        await self.close()
        await self.autosave()
        logging.info("Closing HTTP session...")
        await self.http_session.close()
        logging.info("HTTP session closed.")


    def __del__(self):
        if self.destructor_called:
            return
        self.loop.run_until_complete(self._async__del__())


    @commands.Cog.listener()
    async def on_ready(self) -> None:
        # on_ready also fires when the bot regains connection.
        if self.finished_initializing:
            logging.info("Logged back in.")
        else:
            logging.info(f"Logged in as {self.user}")
            self.finished_initializing = True


    async def setup_hook(self) -> None:
        """ Constructor Part 2: Enter Async """
        self.http_session = aiohttp.ClientSession(loop=self.loop)

        # Parrot has to do async stuff as part of its destructor, so it can't
        # actually use __del__, which is strictly synchronous. So we have to
        # reinvent a little bit of the wheel and manually set a function to run
        # when Parrot is about to be destroyed -- except instead we'll do it
        # when the event loop is about to be closed.
        asyncio_atexit.register(self._async__del__, loop=self.loop)

        self.corpora = CorpusManager(
            db=self.db,
            get_registered_users=self.get_registered_users,
            command_prefix=self.command_prefix,
        )
        self.avatars = AvatarManager(
            loop=self.loop,
            db=self.db,
            http_session=self.http_session,
            fetch_channel=self.fetch_channel,
        )

        self.autosave.start()
        await self.load_extension("jishaku")
        await self.load_folder("events")
        await self.load_folder("commands")


    async def load_folder(self, folder_name: str) -> None:
        filenames = []
        for filename in os.listdir(folder_name):
            abs_path = os.path.join(folder_name, filename)
            if os.path.isfile(abs_path):
                filename = os.path.splitext(filename)[0]
                filenames.append(filename)

        for module in filenames:
            path = f"{folder_name}.{module}"
            try:
                logging.info(f"Loading {path}... ")
                await self.load_extension(path)
                logging.info("✅")
            except Exception as error:
                logging.info("❌")
                logging.error(f"{error}\n")


    @tasks.loop(seconds=config.AUTOSAVE_INTERVAL_SECONDS)
    async def autosave(self) -> None:
        logging.info("Saving database...")
        self.con.commit()
        logging.info("Save complete.")


    @lru_cache(maxsize=int(config.MODEL_CACHE_SIZE))
    def get_model(self, user_id: int) -> ParrotMarkov:
        """ Get a Markov model by user ID. """
        res = self.db.execute(
            "SELECT content FROM messages WHERE user_id = ?", (user_id,)
        )
        rows = res.fetchall()
        messages = []
        for row in rows:
            messages.append(row[0])
        # messages = [row[0] for row in res.fetchall()]
        if len(messages) == 0:
            raise NoDataError("Speak more! No data on this user.")
        return ParrotMarkov(messages)


    def validate_message(self, message: Message) -> bool:
        """
        A message must pass all of these checks before Parrot can learn from it.
        """
        return (
            # Text content not empty.
            len(message.content) > 0 and

            # Not a Parrot command.
            not message.content.startswith(self.command_prefix) and

            # Only learn in text channels, not DMs.
            message.channel.type == ChannelType.text and

            # Most bots' commands start with non-alphanumeric characters, so if
            # a message starts with one other than a known Markdown character or
            # special Discord character, Parrot should just avoid it because
            # it's probably a command.
            (
                message.content[0].isalnum() or
                regex.discord_string_start.match(message.content[0]) or
                regex.markdown.match(message.content[0])
            ) and

            # Don't learn from self.
            message.author.id != self.user.id and

            # Don't learn from Webhooks.
            not message.webhook_id and

            # Parrot must be allowed to learn in this channel.
            message.channel.id in self.learning_channels and

            # People will often say "v" or "z" on accident while spamming,
            # and it doesn't really make for good learning material.
            message.content not in ("v", "z")
        )


    def learn_from(self, messages: Union[Message, List[Message]]) -> int:
        """
        Add a Message or list of Messages to a user's corpus.
        Every Message in the list must be from the same user.
        """
        # Ensure that messages is a list.
        # If it's not, make it a list with one value.
        if not isinstance(messages, list):
            messages = [messages]

        user = messages[0].author

        # Every message in the list must have the same author, because the
        # Corpus Manager adds every message passed to it to the same user.
        for message in messages:
            if message.author != user:
                raise ValueError(
                    "Too many authors; every message in a list passed to"
                    "learn_from() must have the same author."
                )

        # Only keep messages that pass all of validate_message()'s checks.
        messages = list(filter(self.validate_message, messages))

        # Add these messages to this user's corpus and return the number of
        # messages that were added.
        if len(messages) > 0:
            return self.corpora.add(user, messages)
        return 0


    def update_learning_channels(self) -> None:
        """ Fetch and cache the set of channels that Parrot can learn from. """
        res = self.db.execute("SELECT id FROM channels WHERE can_learn_here = 1")
        self.learning_channels = {row[0] for row in res.fetchall()}


    def update_speaking_channels(self) -> None:
        """ Fetch and cache the set of channels that Parrot can speak in. """
        res = self.db.execute("SELECT id FROM channels WHERE can_speak_here = 1")
        self.speaking_channels = {row[0] for row in res.fetchall()}


    def update_registered_users(self) -> None:
        """ Fetch and cache the set of users who are registered. """
        res = self.db.execute("SELECT id FROM users WHERE is_registered = 1")
        self.registered_users = {row[0] for row in res.fetchall()}


    def get_registered_users(self) -> Set[int]:
        return self.registered_users
