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
        await ctx.send(
            f"NEED PING??? Took **{round(self.bot.latency * 1000, 2)}** ms"
        )

    @commands.command(
        aliases=["about", "bio", "code", "github", "source", "sourcecode"]
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def info(self, ctx: commands.Context) -> None:
        """ Get info about Parrot. """
        creator = await self.bot.fetch_user("206235904644349953")

        bio = (
            f"Parrot can imitate everyone. Do `{self.bot.command_prefix}imitate"
            "me` to have Parrot imitate you, or do"
            f"`{self.bot.command_prefix}help` to see what else Parrot can do."
        )

        embed = Embed(
            title="🦜 Parrot",
            description=bio,
        )
        embed.add_field(
            name="GitHub",
            value="https://github.com/garlic-os/parrot",
        )
        embed.set_thumbnail(url=self.bot.user.display_avatar.url)
        embed.set_footer(
            text=f"Made by {creator.name}",
            icon_url=creator.avatar.url,
        )

        await ctx.send(embed=embed)


async def setup(bot: Parrot) -> None:
    await bot.add_cog(Miscellaneous(bot))
