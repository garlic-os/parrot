
from typing import List, Optional, Union
from discord import Activity, ActivityType, AllowedMentions, ChannelType, Message
from discord.ext.commands import AutoShardedBot

import os
import time
import logging
import time
from redis import Redis
from functools import lru_cache
from utils.parrot_markov import ParrotMarkov
from utils import regex
from database.redis_set import RedisSet
from database.corpus_manager import CorpusManager


class Parrot(AutoShardedBot):
    def __init__(
        self, *,
        prefix: str,
        owner_ids: List[int],
        admin_role_ids: Optional[List[int]]=None,
        redis: Redis,
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
        )
        self.admin_role_ids = admin_role_ids or []
        self.redis = redis

        self.registered_users = RedisSet(redis, "registered_users")
        self.learning_channels = RedisSet(redis, "learning_channels")
        self.speaking_channels = RedisSet(redis, "speaking_channels")
        self.corpora = CorpusManager(
            redis=redis,
            registered_users=self.registered_users,
            command_prefix=self.command_prefix,
        )

        self.load_extension("jishaku")
        self.load_folder("events")
        self.load_folder("commands")


    def _list_filenames(self, directory: str) -> List[str]:
        files = []
        for filename in os.listdir(directory):
            abs_path = os.path.join(directory, filename)
            if os.path.isfile(abs_path):
                filename = os.path.splitext(filename)[0]
                files.append(filename)
        return files


    def load_folder(self, folder_name: str) -> None:
        for module in self._list_filenames(folder_name):
            path = f"{folder_name}.{module}"
            try:
                logging.info(f"Loading {path}... ")
                self.load_extension(path)
                logging.info("✅")
            except Exception as error:
                logging.info("❌")
                logging.error(f"{error}\n")


    def run(self, token: str, *, bot: bool=True, reconnect: bool=True) -> None:
        redis_is_ready = self.redis.ping()
        if not redis_is_ready:
            logging.warn("Waiting for the database to finish loading...")
        while not redis_is_ready:
            time.sleep(1/10)
            redis_is_ready = self.redis.ping()
        return super().run(token, bot=bot, reconnect=reconnect)


    @lru_cache(maxsize=int(os.environ.get("CHAIN_CACHE_SIZE", 5)))
    def get_model(self, user_id: int) -> ParrotMarkov:
        """ Get a Markov model by user ID. """
        return ParrotMarkov(self.corpora.get(user_id))
        

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


    def learn_from(self, message: Message) -> int:
        """ Add a Message to a user's corpus. """
        if self.validate_message(message):
            return self.corpora.add(message.author, message)
        return 0
