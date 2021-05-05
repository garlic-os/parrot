from discord import TextChannel
from discord.ext import commands
from utils.checks import is_admin
from utils.parrot_embed import ParrotEmbed
from utils import Paginator


class Admin(commands.Cog):
    @commands.command()
    @commands.check(is_admin)
    @commands.cooldown(2, 4, commands.BucketType.user)
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
        await ctx.bot.get_command("help").callback(
            ctx,
            command=ctx.command.qualified_name,
        )


    @commands.group(
        aliases=["channels"],
        invoke_without_command=True,
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def channel(self, ctx: commands.Context, action: str=None, channel_type: str=None) -> None:
        """ Manage Parrot's channel permissions. """
        if action is None:
            await self.send_help(ctx)


    @channel.group(
        brief="Let Parrot learn or speak in a channel.",
        invoke_without_command=True,
    )
    @commands.check(is_admin)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def add(self, ctx: commands.Context, channel_type: str=None) -> None:
        """ Give Parrot learning or speaking permission in a new channel. """
        if channel_type is None:
            await self.send_help(ctx)


    @add.command(
        name="learning",
        brief="Let Parrot learn in a new channel."
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
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
    @commands.cooldown(2, 4, commands.BucketType.user)
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
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def remove(self, ctx: commands.Context, channel_type: str=None) -> None:
        """ Remove Parrot's learning or speaking permission in a channel. """
        if channel_type is None:
            await self.send_help(ctx)


    @remove.command(
        name="learning",
        brief="Remove Parrot's learning permission in a channel."
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
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
    @commands.cooldown(2, 4, commands.BucketType.user)
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


    @channel.group(invoke_without_command=True)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def view(self, ctx: commands.Context, channel_type: str=None) -> None:
        """ View the channels Parrot can speak or learn in. """
        if channel_type is None:
            await self.send_help(ctx)


    @view.command(name="learning")
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def view_learning(self, ctx: commands.Context) -> None:
        """ View the channels Parrot is learning from. """
        embed = ParrotEmbed(title="Parrot is learning from these channels:")
        channel_mentions = []
        for channel in ctx.guild.channels:
            if channel.id in ctx.bot.learning_channels:
                channel_mentions.append(channel.mention)
        
        paginator = Paginator.FromList(
            ctx,
            entries=channel_mentions,
            template_embed=embed,
        )
        await paginator.run()


    @view.command(name="speaking")
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def view_speaking(self, ctx: commands.Context) -> None:
        """ View the channels Parrot can imitate people in. """
        embed = ParrotEmbed(title="Parrot is learning from these channels:")
        channel_mentions = []
        for channel in ctx.guild.channels:
            if channel.id in ctx.bot.speaking_channels:
                channel_mentions.append(channel.mention)
        
        paginator = Paginator.FromList(
            ctx,
            entries=channel_mentions,
            template_embed=embed,
        )
        await paginator.run()


    @commands.group(invoke_without_command=True)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def nickname(self, ctx: commands.Context, action: str=None) -> None:
        """ Manage Parrot's nickname. """
        if action is None:
            await self.send_help(ctx)

    @nickname.command(name="get", aliases=["view"])
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def nickname_get(self, ctx: commands.Context) -> None:
        """ See Parrot's current nickname, if it has one. """
        if ctx.guild.me.nick is None:
            await ctx.send("Parrot does not have a nickname in this server.")
        else:
            await ctx.send(f"Parrot's nickname is: {ctx.guild.me.nick}")

    @nickname.command(name="set")
    @commands.check(is_admin)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def nickname_set(self, ctx: commands.Context, *, new_nick: str=None) -> None:
        """ Change Parrot's nickname. """
        if new_nick is None:
            await self.send_help(ctx)
            return

        await ctx.guild.me.edit(
            nick=new_nick,
            reason=f"Requested by {ctx.author.name}#{ctx.author.discriminator}",
        )
        await ctx.send(f"✅ Parrot's nickname is now: {ctx.guild.me.nick}")

    @nickname.command(name="remove", aliases=["delete"])
    @commands.check(is_admin)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def nickname_remove(self, ctx: commands.Context) -> None:
        """ Get rid of Parrot's nickname. """
        await ctx.guild.me.edit(
            nick=None,
            reason=f"Requested by {ctx.author.name}#{ctx.author.discriminator}",
        )
        await ctx.send("✅ Parrot's nickname has been removed.")



def setup(bot: commands.Bot) -> None:
    bot.add_cog(Admin())
