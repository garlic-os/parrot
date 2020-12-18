from discord import TextChannel
from discord.ext import commands
from utils.checks import is_admin


class Admin(commands.Cog):
    @commands.command()
    @commands.check(is_admin)
    async def delete(self, ctx: commands.Context, message_id: int) -> None:
        """ Delete a message Parrot has said. """
        message = await ctx.fetch_message(message_id)
        guild = ctx.guild
        me = guild.me if guild is not None else ctx.bot.user
        if message.webhook_id is None:
            author = message.author
        else:
            webhook = await ctx.bot.fetch_webhook(message.webhook_id)
            author = webhook.user
        if author == me:
            await message.delete()
        else:
            await ctx.send("❌ Parrot can only delete its own messages.")


    async def send_help(self, ctx: commands.Context) -> None:
        await ctx.bot.get_command("help")(
            ctx,
            command=ctx.command.qualified_name
        )


    @commands.group(
        aliases=["channels"],
        brief="View and manage Parrot's channel permissions.",
        invoke_without_command=True,
    )
    async def channel(self, ctx: commands.Context, action: str=None) -> None:
        if action is None: 
            await self.send_help(ctx)


    @channel.group(
        brief="Let Parrot learn or speak in a channel.",
        invoke_without_command=True,
    )
    @commands.check(is_admin)
    async def add(self, ctx: commands.Context, channel_type: str=None) -> None:
        """ Give Parrot learning or speaking permission in a new channel. """
        if channel_type is None:
            await self.send_help(ctx)


    @add.command(
        name="learning",
        brief="Let Parrot learn in a new channel."
    )
    async def add_learning(self, ctx: commands.Context, channel: TextChannel) -> None:
        """
        Give Parrot permission to learn in a new channel.
        Parrot will start to collect messages from registered users in this channel.
        """
        if channel.id in ctx.bot.learning_channels:
            await ctx.send(f"⚠ Already learning in {channel.mention}!")
        else:
            ctx.bot.learning_channels.add(channel.id)
            await ctx.send(f"✅ Now learning in {channel.mention}.")


    @add.command(
        name="speaking",
        brief="Let Parrot speak in a new channel."
    )
    async def add_speaking(self, ctx: commands.Context, channel: TextChannel) -> None:
        """
        Give Parrot permission to speak in a new channel.
        Parrot will be able to imitate people in this channel.
        """
        if channel.id in ctx.bot.speaking_channels:
            await ctx.send(f"⚠ Already able to speak in {channel.mention}!")
        else:
            ctx.bot.speaking_channels.add(channel.id)
            await ctx.send(f"✅ Now able to speak in {channel.mention}.")


    @channel.group(
        aliases=["delete"],
        brief="Remove Parrot's learning or speaking permission somewhere.",
        invoke_without_command=True,
    )
    @commands.check(is_admin)
    async def remove(self, ctx: commands.Context, channel_type: str=None) -> None:
        """ Remove Parrot's learning or speaking permission in a channel. """
        if channel_type is None:
            await self.send_help(ctx)


    @remove.command(
        name="learning",
        brief="Remove Parrot's learning permission in a channel."
    )
    async def remove_learning(self, ctx: commands.Context, channel: TextChannel) -> None:
        """
        Remove Parrot's permission to learn in a channel.
        Parrot will stop collecting messages in this channel.
        """
        if channel.id in ctx.bot.learning_channels:
            ctx.bot.learning_channels.remove(channel.id)
            await ctx.send(f"❌ No longer learning in {channel.mention}.")
        else:
            await ctx.send(f"⚠ Already not learning in {channel.mention}!")


    @remove.command(
        name="speaking",
        brief="Remove Parrot's speaking permission in a channel."
    )
    async def remove_speaking(self, ctx: commands.Context, channel: TextChannel) -> None:
        """
        Remove Parrot's permission to speak in a channel.
        Parrot will no longer be able to imitate people in this channel.
        """
        if channel.id in ctx.bot.speaking_channels:
            ctx.bot.speaking_channels.remove(channel.id)
            await ctx.send(f"❌ No longer able to speak in {channel.mention}.")
        else:
            await ctx.send(f"⚠ Already not able to speak in {channel.mention}!")


    @commands.group(invoke_without_command=True)
    async def view(self, ctx: commands.Context, channel_type: str=None) -> None:
        """ View the channels Parrot can speak or learn in. """
        if channel_type is None:
            await self.send_help(ctx)


    @view.command(name="learning")
    async def view_learning(self, ctx: commands.Context) -> None:
        """ View the channels Parrot is learning from. """
        raise NotImplementedError()


    @view.command(name="speaking")
    async def view_speaking(self, ctx: commands.Context) -> None:
        """ View the channels Parrot can imitate people in. """
        raise NotImplementedError()


def setup(bot: commands.Bot) -> None:
    bot.add_cog(Admin())
