import random
import logging
from discord.ext import commands
from utils.pembed import Pembed
from discord.ext.commands.errors import (
    CommandError,
    CommandNotFound,
)


with open("failure-phrases.txt", "r") as f:
    failure_phrases = list(f.readlines())


class CommandErrorEventHandler(commands.Cog):
    @commands.Cog.listener()
    async def on_command_error(self, ctx: commands.Context, error: CommandError) -> None:
        # Ignore Command Not Found errors
        if type(error) is CommandNotFound:
            return

        # Display the text of Friendly Errors directly
        if type(error.__cause__) is str and error.__cause__.startswith("Friendly Error: "):
            error_text = error.__cause__[16:]
        else:
            error_text = str(error)  # type: ignore
            logging.error(f"\n{error_text}\n")

        embed = Pembed(
            title=random.choice(failure_phrases),
            description=error_text,
            color_name="red",
            author=ctx.author,
        )
        await ctx.send(embed=embed)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(CommandErrorEventHandler(bot))
