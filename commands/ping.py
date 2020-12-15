from discord.ext import commands


class Ping(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.command()
    async def ping(self, ctx: commands.Context) -> None:
        """ Respond with the bot's reponse time. """
        await ctx.send(f"Ping! Took **{round(self.bot.latency * 1000, 2)}** ms")


def setup(bot: commands.Bot) -> None:
    bot.add_cog(Ping(bot))
