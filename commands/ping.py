from discord.ext import commands


class Ping(commands.Cog):
    @commands.command()
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def ping(self, ctx: commands.Context) -> None:
        """ Respond with the bot's reponse time. """
        await ctx.send(f"Ping! Took **{round(ctx.bot.latency * 1000, 2)}** ms")


def setup(bot: commands.Bot) -> None:
    bot.add_cog(Ping())
