from discord.ext import commands
from bot import Parrot
from utils import ParrotEmbed, tag
from utils.converters import Userlike
from utils.exceptions import FriendlyError


class Registration(commands.Cog):
    def __init__(self, bot: Parrot):
        self.bot = bot


    @commands.command(
        aliases=["agree", "accept", "initiate", "initate"],
        brief="Register with Parrot."
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def register(self, ctx: commands.Context, who: Userlike=None) -> None:
        """ Register to let Parrot imitate you. """
        if who is not None and who.id != ctx.author.id:
            raise FriendlyError("You can only register yourself.")

        # Update the "is_registered" field on this user in the database.
        self.bot.db.execute(
            """
            INSERT INTO users (id, is_registered)
            VALUES (?, 1)
            ON CONFLICT (id) DO UPDATE
            SET is_registered = EXCLUDED.is_registered
            """,
            (ctx.author.id,)
        )
        self.bot.update_registered_users()

        embed = ParrotEmbed(
            title="✅ Registered!",
            color_name="green",
            description=(
                "Now Parrot can start learning your speech patterns and "
                "imitate you."
            )
        )
        embed.add_field(
            name="Tip:",
            value=(
               f"Try the `{self.bot.command_prefix}quickstart` command to "
                "immediately give Parrot a dataset to imitate you from! It "
                "will scan your past messages to create a model of how you "
                "speak so you can start using Parrot right away."
            )
        )

        await ctx.send(embed=embed)

    @commands.command(
        aliases=["disagree", "unaccept", "uninitiate", "uninitate"],
        brief="Unregister with Parrot."
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def unregister(
        self,
        ctx: commands.Context,
        who: Userlike=None
    ) -> None:
        """
        Remove your registration from Parrot.
        Parrot will stop collecting your messages and will not be able to
        imitate you until you register again.
        """
        if who is not None and who.id != ctx.author.id:
            raise FriendlyError("You can only unregister yourself.")

        self.bot.db.execute(
            "UPDATE users SET is_registered = 0 WHERE id = ?", (ctx.author.id,)
        )
        self.bot.update_registered_users()

        embed = ParrotEmbed(
            title="Unregistered!",
            color_name="gray",
            description=(
                "Parrot will no longer be able to imitate you and it "
                "has stopped collecting your messages.\n\n_If you're done with "
                "Parrot and don't want it to have your messages anymore, or if "
                "you just want a fresh start, you can do "
                f"`{self.bot.command_prefix}forget me` and your existing data "
                "will be permanently deleted from Parrot._"
            )
        )

        await ctx.send(embed=embed)

    @commands.command(
        aliases=[
            "registration_status",
            "registrationstatus",
            "registration",
            "checkregistration",
            "check_registration",
        ],
        brief="Check if you're registered with Parrot.",
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def status(self, ctx: commands.Context, who: Userlike=None) -> None:
        """
        Check if you're registered with Parrot.
        You need to be registered for Parrot to be able to analyze your messages
        and imitate you.
        """
        if who is None:
            who = ctx.author
        subject_verb = "You are" if who.id == ctx.author.id else f"{tag(who)} is"
        if who.id in self.bot.registered_users:
            await ctx.send(f"✅ {subject_verb} are currently registered with Parrot.")
        else:
            await ctx.send(f"❌ {subject_verb} not currently registered with Parrot.")


async def setup(bot: Parrot) -> None:
    await bot.add_cog(Registration(bot))
