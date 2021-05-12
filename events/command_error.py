import random
import logging
from discord.ext import commands
from utils.parrot_embed import ParrotEmbed
from discord.ext.commands.errors import (
    CommandError,
    CommandNotFound,
)


with open("assets/failure-phrases.txt", "r") as f:
    failure_phrases = list(f.readlines())


class CommandErrorEventHandler(commands.Cog):
    @commands.Cog.listener()
    async def on_command_error(self, ctx: commands.Context, error: CommandError) -> None:
        # Ignore Command Not Found errors
        if isinstance(error, CommandNotFound):
            return

        # Display the text of Friendly Errors directly
        if str(error.__cause__).startswith("Friendly Error: "):
            error_text = str(error.__cause__)[16:]
        else:
            error_text = str(error)
            logging.error(f"\n{error_text}\n")

        embed = ParrotEmbed(
            title=random.choice(failure_phrases),
            description=error_text,
            color_name="red",
        )
        await ctx.send(embed=embed, reference=ctx.message)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(CommandErrorEventHandler(bot))
