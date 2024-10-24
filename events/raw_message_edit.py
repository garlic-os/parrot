from discord import RawMessageUpdateEvent
from bot import Parrot
from utils.exceptions import NoDataError

import logging
from discord.ext import commands


class RawMessageEditEventHandler(commands.Cog):
    def __init__(self, bot: Parrot):
        self.bot = bot

    # Update the database when a message is edited.
    # Must use the raw event because the main event doesn't catches edit events
    # for messages that happen to be in its cache.
    @commands.Cog.listener()
    async def on_raw_message_edit(self, event: RawMessageUpdateEvent) -> None:
        if "content" not in event.data:
            logging.error(f"Unexpected message edit event format: {event.data}")
            return
        try:
            self.bot.corpora.edit(event.message_id, event.data["content"])
        except NoDataError:
            channel = self.bot.get_channel(event.channel_id)
            message = await channel.fetch_message(event.message_id)
            self.bot.corpora.add(message.author, message)


async def setup(bot: Parrot) -> None:
    await bot.add_cog(RawMessageEditEventHandler(bot))
