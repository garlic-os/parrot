from discord import Message

import os
from discord.ext import commands
from utils.exceptions import NotRegisteredError


class MessageEventHandler(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message: Message) -> None:
        """
        Handle receiving messages.
        Monitors messages of registered users.
        """
        # I am a mature person making a competent Discord bot.
        if (
            message.content == "ayy"
            and
            os.environ.get("AYY_LMAO", None) in ("true", "True", "1")
        ):
            await message.channel.send("lmao")

        # Ignore NotRegisteredError errors; Parrot shouldn't learn from
        #   non-registered users, anyway.
        try:
            learned_count = self.bot.learn_from(message)
            tag = f"{message.author.name}#{message.author.discriminator}"

            # Log results.
            if learned_count == 1:
                print(f"Collected a message from {tag}")
            elif learned_count != 0:
                print(f"Collected {learned_count} messages from {tag}")
        except NotRegisteredError:
            pass


def setup(bot: commands.Bot) -> None:
    bot.add_cog(MessageEventHandler(bot))
