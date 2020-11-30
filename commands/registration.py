from discord.ext import commands
from utils.pembed import Pembed


class RegistrationCommands(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.command(brief="Register with Parrot.")
    @commands.cooldown(1, 5, commands.BucketType.user)
    async def register(self, ctx: commands.Context) -> None:
        """
        Register to let Parrot imitate you.
        By registering you agree to Parrot's privacy policy.
        """
        self.bot.registration.add(ctx.author.id)

        embed = Pembed(
            title="✅ Registered!",
            color_name="green",
            description="Now Parrot can start learning your speech patterns and imitate you.",
        )
        embed.add_field(
            name="Tip:",
            value="If this is your first time registering (or if you deleted your data recently), you might want to consider running the `quickstart` command to immediately give Parrot a dataset to imitate you from. This will scan your past messages to create a model of how you speak, so you can start using Parrot right away.",
        )
        embed.set_footer(text=f"{self.bot.command_prefix}quickstart")

        await ctx.send(embed=embed)

    @commands.command(brief="Unregister from Parrot.")
    @commands.cooldown(1, 5, commands.BucketType.user)
    async def unregister(self, ctx: commands.Context) -> None:
        """
        Remove your registration from Parrot.
        Parrot will stop collecting your messages and will not be able to imitate you until you register again.
        """
        self.bot.registration.remove(ctx.author.id)

        embed = Pembed(
            title="Unregistered!",
            color_name="gray",
            description=f"Parrot will no longer be able to imitate you, and it has stopped collecting your messages.\n\n_If you're done with Parrot and don't want it to have your messages anymore, or if you just want a fresh start, you can do `{self.bot.command_prefix}forget me` and your existing data will be permanently deleted from Parrot._",
        )

        await ctx.send(embed=embed)

    @commands.command(
        aliases=[
            "registrationstatus",
            "registration",
            "status",
            "checkregistration",
            "check_registration",
        ],
        brief="Check if you're registered with Parrot.",
    )
    @commands.cooldown(1, 2, commands.BucketType.user)
    async def registration_status(self, ctx: commands.Context) -> None:
        """
        Check if you're registered with Parrot.
        You need to be registered for Parrot to be able to analyze your messages and imitate you.
        """
        if ctx.author.id in self.bot.registration:
            await ctx.send("✅ You are currently registered with Parrot.")
        else:
            await ctx.send("❌ You are not currently registered with Parrot.")


def setup(bot: commands.Bot) -> None:
    bot.add_cog(RegistrationCommands(bot))
