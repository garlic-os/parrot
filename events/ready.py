from bot import Parrot

import logging
from discord.ext import commands


class ReadyEventHandler(commands.Cog):
    def __init__(self, bot: Parrot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_ready(self) -> None:
        user = self.bot.user
        logging.info(f"Logged in as {user}")


async def setup(bot: Parrot) -> None:
    await bot.add_cog(ReadyEventHandler(bot))
