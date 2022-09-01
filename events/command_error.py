from bot import Parrot
from discord.ext.commands.errors import CommandError, CommandNotFound

import random
import logging
import traceback
from discord.ext.commands import Cog, Context
from utils.parrot_embed import ParrotEmbed


class CommandErrorEventHandler(Cog):
    def __init__(self, error_message_titles: str):
        with open(error_message_titles, "r") as f:
            self.error_message_titles = list(f.readlines())

    @Cog.listener()
    async def on_command_error(self, ctx: Context, error: CommandError) -> None:
        # Ignore Command Not Found errors
        if isinstance(error, CommandNotFound):
            return

        if str(error.__cause__).startswith("Friendly Error: "):
            # Don't log Friendly Errors; display their text directly
            error_text = str(error.__cause__)[16:]
        else:
            # Log all other kinds of errors (REAL errors)
            error_text = str(error)
            logging.error(
                "\n".join(
                    traceback.format_exception(None, error, error.__traceback__)
                )
            )

        # Send the error message to the channel it came from
        embed = ParrotEmbed(
            title=random.choice(self.error_message_titles),
            description=error_text,
            color_name="red",
        )
        await ctx.send(embed=embed, reference=ctx.message)


async def setup(bot: Parrot) -> None:
    await bot.add_cog(CommandErrorEventHandler("assets/failure-phrases.txt"))
