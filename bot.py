from typing import List, Optional

import os
import time
import logging
import time
from redis import Redis
from discord import Activity, ActivityType, AllowedMentions
from discord.ext.commands import AutoShardedBot


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
        self.load_extension("jishaku")
        self.load_folder("cogs")
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
