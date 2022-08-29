from typing import List, Optional, Set, Union
from discord import (
    Activity, ActivityType, AllowedMentions, ChannelType, Message, Intents
)
from discord.ext.commands import AutoShardedBot
from sqlite3 import Cursor

import config
import os
import time
import logging
import time
import aiohttp
from functools import lru_cache
from utils.parrot_markov import ParrotMarkov
from utils import regex
from database.corpus_manager import CorpusManager
from database.avatar_manager import AvatarManager


class Parrot(AutoShardedBot):
    def __init__(
        self, *,
        prefix: str,
        owner_ids: List[int],
        admin_role_ids: Optional[List[int]]=None,
        db: Cursor,
    ):
        super().__init__(
            command_prefix=prefix,
            owner_ids=owner_ids,
            case_insensitive=True,
            allowed_mentions=AllowedMentions.none(),
            activity=Activity(
                name=f"everyone ({prefix}help)",
                type=ActivityType.listening,
            ),
            intents=Intents.all(),
        )
        self.admin_role_ids = admin_role_ids or []
        self.http_session = aiohttp.ClientSession()
        self.db = db

        self.db.executescript("""
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
        """)

        self.update_learning_channels()
        self.update_speaking_channels()
        self.update_registered_users()

        self.corpora = CorpusManager(
            db=self.db,
            registered_users=self.registered_users,
            command_prefix=self.command_prefix,
        )

        self.avatars = AvatarManager(
            db=self.db,
            loop=self.loop,
            http_session=self.http_session,
            fetch_channel=self.fetch_channel,
        )

        self.load_extension("jishaku")
        self.load_folder("events")
        self.load_folder("commands")


    def __del__(self):
        self.http_session.close()


    @lru_cache(maxsize=int(config.MODEL_CACHE_SIZE))
    def get_model(self, user_id: int) -> ParrotMarkov:
        """ Get a Markov model by user ID. """
        res = self.db.execute(
            "SELECT content FROM messages WHERE user_id = ?", (user_id,)
        )
        messages = [row[0] for row in res.fetchall()]
        return ParrotMarkov(messages)
        

    def validate_message(self, message: Message) -> bool:
        """
        A message must pass all of these checks before Parrot can learn from it.
        """
        content = message.content

        return (
            # Text content not empty.
            # mypy giving some nonsense error that doesn't occur in runtime
            len(content) > 0 and  # type: ignore

            # Not a Parrot command.
            not content.startswith(self.command_prefix) and

            # Only learn in text channels, not DMs.
            message.channel.type == ChannelType.text and

            # Most bots' commands start with non-alphanumeric characters, so if
            # a message starts with one other than a known Markdown character or
            # special Discord character, Parrot should just avoid it because
            # it's probably a command.
            (
                content[0].isalnum() or
                regex.discord_string_start.match(content[0]) or
                regex.markdown.match(content[0])
            ) and

            # Don't learn from self.
            message.author.id != self.user.id and

            # Don't learn from Webhooks.
            not message.webhook_id and

            # Parrot must be allowed to learn in this channel.
            message.channel.id in self.learning_channels and

            # People will often say "v" or "z" on accident while spamming;
            # they don't like when Parrot learns from those mistakes.
            content not in ("v", "z")
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
                raise ValueError("Too many authors; every message in a list passed to learn_from() must have the same author.")

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


    def load_folder(self, folder_name: str) -> None:
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
                self.load_extension(path)
                logging.info("✅")
            except Exception as error:
                logging.info("❌")
                logging.error(f"{error}\n")
