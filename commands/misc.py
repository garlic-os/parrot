from discord.ext import commands
from utils.parrot_embed import ParrotEmbed


class Miscellaneous(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.command()
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def ping(self, ctx: commands.Context) -> None:
        """ Get the bot's reponse time. """
        await ctx.send(f"NEED PING??? Took **{round(ctx.bot.latency * 1000, 2)}** ms")

    @commands.command(aliases=["about", "bio"])
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def info(self, ctx: commands.Context) -> None:
        """ Get info about Parrot. """
        creator = await ctx.bot.fetch_user("206235904644349953")

        bio = "Parrot can imitate everyone. Do `"\
             f"{ctx.bot.command_prefix}imitate me` to have Parrot imitate you,"\
             f" or do `{ctx.bot.command_prefix}help` to see what else Parrot "\
              "can do."

        embed = ParrotEmbed(
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


def setup(bot: commands.Bot) -> None:
    bot.add_cog(Miscellaneous(bot))
