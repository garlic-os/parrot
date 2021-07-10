from discord import Embed
from discord.ext import commands
from bot import Parrot


class Miscellaneous(commands.Cog):
    def __init__(self, bot: Parrot):
        self.bot = bot

    @commands.command()
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def ping(self, ctx: commands.Context) -> None:
        """ Get the bot's reponse time. """
        await ctx.send(f"NEED PING??? Took **{round(ctx.bot.latency * 1000, 2)}** ms")

    @commands.command(aliases=["about", "bio", "code", "github", "source", "sourcecode"])
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def info(self, ctx: commands.Context) -> None:
        """ Get info about Parrot. """
        creator = await ctx.bot.fetch_user("206235904644349953")

        bio = "Parrot can imitate everyone. Do `"\
             f"{ctx.bot.command_prefix}imitate me` to have Parrot imitate you,"\
             f" or do `{ctx.bot.command_prefix}help` to see what else Parrot "\
              "can do."

        embed = Embed(
            title="🦜 Parrot",
            description=bio,
        )
        embed.add_field(
            name="GitHub",
            value="https://github.com/the-garlic-os/parrot",
        )
        embed.set_thumbnail(url=ctx.bot.user.avatar_url)
        embed.set_footer(
            text=f"Made by {creator.name}",
            icon_url=creator.avatar_url,
        )

        await ctx.send(embed=embed)


def setup(bot: Parrot) -> None:
    bot.add_cog(Miscellaneous(bot))
