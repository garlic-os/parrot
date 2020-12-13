from typing import Dict, Optional, Union

import os
import ujson as json  # ujson is faster
from discord import Webhook
from discord.ext import commands


class WebhookSeed:
    def __init__(self, id: int, token: str) -> None:
        self.id = id
        self.token = token


class WebhookManager(Dict[int, Union[Webhook, WebhookSeed]]):
    """
    Lazy loads Webhooks from a file. Every Webhook is stored as a simple ID and
      token until accessed. When accessed, a Webhook is instantiated from this
      Webhook Seed and the stored in the seed's place.
    """

    def __init__(self, path: str) -> None:
        try:
            with open(path, "r") as f:
                self.update(json.load(f))
        except FileNotFoundError:
            print(f"File {path} not found. A new file will be created in its place.")
            with open(path, "w") as f:
                f.write("{}")

    def __getitem__(self, channel_id: int) -> Optional[Webhook]:
        """
        Get a Webhook client for this channel if Parrot has one on file.
        """
        entry: Optional[Union[Webhook, WebhookSeed]] = self.get(channel_id, None)

        # Either:
        #   Entry is a Webhook. It must have already been instantiated, so
        #   return it.
        # Or:
        #   Entry does not exist, so return None. Which is what the entry is,
        #   so we can save a condition and just return the entry.
        if entry is None or type(entry) is Webhook:
            return entry
        # Entry is a Webhook Seed; create a Webhook from this seed and store
        #   it for next time.
        webhook = Webhook(entry["id"], entry["token"])
        self[channel_id] = webhook
        return webhook


class CorpusManagerCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        bot.webhooks = WebhookManager(
            os.environ.get("DB_WEBHOOKS_PATH", "data/webhooks.json")
        )


def setup(bot: commands.Bot) -> None:
    bot.add_cog(CorpusManagerCog(bot))
