from discord.ext import commands


class ReadyEventHandler(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_ready(self) -> None:
        user = self.bot.user
        print(f"Logged in as {user}")


def setup(bot: commands.Bot) -> None:
    bot.add_cog(ReadyEventHandler(bot))
