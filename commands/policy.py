from discord.ext import commands
from utils.pembed import Pembed


class PolicyCommand(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        with open("privacy-policy.txt", "r") as f:
            self.policy_text = f.read()

    @commands.command(
        aliases=[
            "privacy_policy",
            "privacypolicy",
            "privacy",
            "terms_of_service",
            "termsofservice",
            "tos",
            "terms",
            "eula",
        ],
        brief="View Parrot's privacy policy.",
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def policy(self, ctx: commands.Context) -> None:
        """
        View Parrot's privacy policy.
        Parrot collects the message history of registered users to imitate them. Learn more about Parrot's data collection practices here.
        """
        embed = Pembed(title="Privacy Policy", description=self.policy_text)
        embed.set_footer(
            text=f"{self.bot.command_prefix}register • {self.bot.command_prefix}unregister"
        )

        await ctx.send(embed=embed)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(PolicyCommand(bot))
