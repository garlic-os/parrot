from discord import TextChannel
from discord.ext import commands
from utils.checks import is_admin


class ChannelCommands(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot


    @commands.group(
        aliases=["channels"],
        brief="View and manage Parrot's channel permissions.",
        invoke_without_command=True,
    )
    async def channel(self, ctx: commands.Context, action: str=None) -> None:
        if action is None: 
            await ctx.send(self.channel.help)


    @channel.group(
        brief="Let Parrot learn or speak in a channel.",
        invoke_without_command=True,
    )
    @commands.check(is_admin)
    async def add(self, ctx: commands.Context, channel_type: str=None) -> None:
        """ Give Parrot learning or speaking permission in a new channel. """
        if channel_type is None: 
            await ctx.send(self.add.help)


    @add.command(
        name="learning",
        brief="Let Parrot learn in a new channel."
    )
    async def add_learning(self, ctx: commands.Context, channel: TextChannel) -> None:
        """
        Give Parrot permission to learn in a new channel.
        Parrot will start to collect messages from registered users in this channel.
        """
        if channel.id in self.bot.learning_channels:
            await ctx.send(f"⚠ Already learning in <#{channel.id}>!")
        else:
            self.bot.learning_channels.add(channel.id)
            await ctx.send(f"✅ Now learning in <#{channel.id}>.")


    @add.command(
        name="speaking",
        brief="Let Parrot speak in a new channel."
    )
    async def add_speaking(self, ctx: commands.Context, channel: TextChannel) -> None:
        """
        Give Parrot permission to speak in a new channel.
        Parrot will be able to imitate people in this channel.
        """
        if channel.id in self.bot.speaking_channels:
            await ctx.send(f"⚠ Already able to speak in <#{channel.id}>!")
        else:
            self.bot.speaking_channels.add(channel.id)
            await ctx.send(f"✅ Now able to speak in <#{channel.id}>.")


    @channel.group(
        brief="Remove Parrot's learning or speaking permission somewhere.",
        invoke_without_command=True,
    )
    @commands.check(is_admin)
    async def remove(self, ctx: commands.Context, channel_type: str=None) -> None:
        """ Remove Parrot's learning or speaking permission in a channel. """
        if channel_type is None:
            await ctx.send(self.remove.help)


    @remove.command(
        name="learning",
        brief="Remove Parrot's learning permission in a channel."
    )
    async def remove_learning(self, ctx: commands.Context, channel: TextChannel) -> None:
        """
        Remove Parrot's permission to learn in a channel.
        Parrot will stop collecting messages in this channel.
        """
        if channel.id in self.bot.learning_channels:
            self.bot.learning_channels.remove(channel.id)
            await ctx.send(f"❌ No longer learning in <#{channel.id}>.")
        else:
            await ctx.send(f"⚠ Already not learning in <#{channel.id}>!")


    @remove.command(
        name="speaking",
        brief="Remove Parrot's speaking permission in a channel."
    )
    async def remove_speaking(self, ctx: commands.Context, channel: TextChannel) -> None:
        """
        Remove Parrot's permission to speak in a channel.
        Parrot will no longer be able to imitate people in this channel.
        """
        if channel.id in self.bot.speaking_channels:
            self.bot.speaking_channels.remove(channel.id)
            await ctx.send(f"❌ No longer able to speak in <#{channel.id}>.")
        else:
            await ctx.send(f"⚠ Already not able to speak in <#{channel.id}>!")


def setup(bot: commands.Bot) -> None:
    bot.add_cog(ChannelCommands(bot))
