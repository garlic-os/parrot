from typing import Iterable

from discord import TextChannel
from discord.ext import commands
from bot import Parrot
from utils.checks import is_admin
from utils import Paginator, ParrotEmbed, tag


class Admin(commands.Cog):
    def __init__(self, bot: Parrot):
        self.bot = bot


    @commands.command()
    @commands.check(is_admin)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def delete(self, ctx: commands.Context, message_id: int) -> None:
        """ Delete a message that Parrot sent. """
        message = await ctx.fetch_message(message_id)
        guild = ctx.guild
        me = guild.me if guild is not None else self.bot.user
        if message.webhook_id is None:
            author = message.author
        else:
            webhook = await self.bot.fetch_webhook(message.webhook_id)
            author = webhook.user
        if author == me:
            await message.delete()
            await ctx.message.add_reaction("✅")
        else:
            await ctx.send("❌ Parrot can only delete its own messages.")
            await ctx.message.add_reaction("❌")


    async def send_help(self, ctx: commands.Context) -> None:
        await self.bot.get_command("help").callback(
            ctx,
            command=ctx.command.qualified_name,
        )


    @commands.group(
        aliases=["channels"],
        invoke_without_command=True,
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def channel(
        self,
        ctx: commands.Context,
        action: str | None=None,
        channel_type: str | None=None,
        channel: TextChannel | None=None,
    ) -> None:
        """ Manage Parrot's channel permissions. """
        if action is None:
            await self.send_help(ctx)


    @channel.group(
        brief="Let Parrot learn or speak in a channel.",
        invoke_without_command=True,
    )
    @commands.check(is_admin)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def add(
        self,
        ctx: commands.Context,
        channel_type: str | None=None,
        channel: TextChannel | None=None,
    ) -> None:
        """ Give Parrot learning or speaking permission in a new channel. """
        if channel_type is None:
            await self.send_help(ctx)

    @add.command(
        name="learning",
        brief="Let Parrot learn in a new channel."
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def add_learning(
        self,
        ctx: commands.Context,
        channel: TextChannel
    ) -> None:
        """
        Give Parrot permission to learn in a new channel.
        Parrot will start to collect messages from registered users in this
        channel.
        """
        if channel.id in self.bot.learning_channels:
            await ctx.send(f"⚠️️ Already learning in {channel.mention}!")
        else:
            self.bot.db.execute(
                """
                INSERT INTO channels (id, can_learn_here)
                VALUES (?, 1)
                ON CONFLICT (id) DO UPDATE
                SET can_learn_here = EXCLUDED.can_learn_here
                """,
                (channel.id,)
            )
            self.bot.update_learning_channels()
            await ctx.send(f"✅ Now learning in {channel.mention}.")

    @add.command(
        name="speaking",
        brief="Let Parrot speak in a new channel."
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def add_speaking(
        self,
        ctx: commands.Context,
        channel: TextChannel
    ) -> None:
        """
        Give Parrot permission to speak in a new channel.
        Parrot will be able to imitate people in this channel.
        """
        if channel.id in self.bot.speaking_channels:
            await ctx.send(f"⚠️️ Already able to speak in {channel.mention}!")
        else:
            self.bot.db.execute(
                """
                INSERT INTO channels (id, can_speak_here)
                VALUES (?, 1)
                ON CONFLICT (id) DO UPDATE
                SET can_speak_here = EXCLUDED.can_speak_here
                """,
                (channel.id,)
            )
            self.bot.update_speaking_channels()
            await ctx.send(f"✅ Now able to speak in {channel.mention}.")


    @channel.group(
        aliases=["delete"],
        brief="Remove Parrot's learning or speaking permission somewhere.",
        invoke_without_command=True,
    )
    @commands.check(is_admin)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def remove(
        self,
        ctx: commands.Context,
        channel_type: str | None=None,
        channel: TextChannel | None=None,
    ) -> None:
        """ Remove Parrot's learning or speaking permission in a channel. """
        if channel_type is None:
            await self.send_help(ctx)

    @remove.command(
        name="learning",
        brief="Remove Parrot's learning permission in a channel."
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def remove_learning(
        self,
        ctx: commands.Context,
        channel: TextChannel
    ) -> None:
        """
        Remove Parrot's permission to learn in a channel.
        Parrot will stop collecting messages in this channel.
        """
        if channel.id in self.bot.learning_channels:
            self.bot.db.execute(
                "UPDATE channels SET can_learn_here = 0 WHERE id = ?;",
                (channel.id,)
            )
            self.bot.update_learning_channels()
            await ctx.send(f"❌ No longer learning in {channel.mention}.")
        else:
            await ctx.send(f"⚠️️ Already not learning in {channel.mention}!")

    @remove.command(
        name="speaking",
        brief="Remove Parrot's speaking permission in a channel."
    )
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def remove_speaking(
        self,
        ctx: commands.Context,
        channel: TextChannel
    ) -> None:
        """
        Remove Parrot's permission to speak in a channel.
        Parrot will no longer be able to imitate people in this channel.
        """
        if channel.id in self.bot.speaking_channels:
            self.bot.db.execute(
                "UPDATE channels SET can_speak_here = 0 WHERE id = ?;",
                (channel.id,)
            )
            self.bot.update_speaking_channels()
            await ctx.send(f"❌ No longer able to speak in {channel.mention}.")
        else:
            await ctx.send(f"⚠️️ Already not able to speak in {channel.mention}!")


    @channel.group(invoke_without_command=True)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def view(self, ctx: commands.Context, channel_type: str | None=None) -> None:
        """ View the channels Parrot can speak or learn in. """
        if channel_type is None:
            await self.send_help(ctx)

    async def do_view_channels(
        self, *,
        ctx: commands.Context,
        channels: Iterable[TextChannel],
        guild_id: int | None,
        message: str,
        failure_message: str
    ) -> None:
        if guild_id is None:
            if ctx.guild is None:
                await ctx.send(failure_message)
                return
            guild_id = ctx.guild.id
        guild = self.bot.get_guild(guild_id)

        embed = ParrotEmbed(title=message)
        channel_mentions = []
        for channel in guild.channels:
            if channel.id in self.bot.learning_channels:
                channel_mentions.append(channel.mention)
        if len(channel_mentions) == 0:
            embed.description = "None"
            await ctx.send(embed=embed)
            return

        paginator = Paginator.FromList(
            ctx,
            entries=channel_mentions,
            template_embed=embed,
        )
        await paginator.run()

    @view.command(name="learning")
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def view_learning(self, ctx: commands.Context, guild_id: int | None=None) -> None:
        """ View the channels Parrot is learning from. """
        await self.do_view_channels(
            ctx=ctx,
            channels=self.bot.learning_channels,
            guild_id=guild_id,
            message="Parrot is learning from these channels:",
            failure_message="Parrot can't speak in DMs. Try passing in a guild ID."
        )

    @view.command(name="speaking")
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def view_speaking(self, ctx: commands.Context, guild_id: int | None=None) -> None:
        """ View the channels Parrot can imitate people in. """
        await self.do_view_channels(
            ctx=ctx,
            channels=self.bot.speaking_channels,
            guild_id=guild_id,
            message="Parrot can speak in these channels:",
            failure_message="Parrot can't speak in DMs. Try passing in a guild ID."
        )


    @commands.group(invoke_without_command=True)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def nickname(self, ctx: commands.Context, action: str | None=None) -> None:
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
    async def nickname_set(
        self,
        ctx: commands.Context,
        *,
        new_nick: str | None=None
    ) -> None:
        """ Change Parrot's nickname. """
        if new_nick is None:
            await self.send_help(ctx)
            return

        await ctx.guild.me.edit(
            nick=new_nick,
            reason=f"Requested by {tag(ctx.author)}",
        )
        await ctx.send(f"✅ Parrot's nickname is now: {ctx.guild.me.nick}")

    @nickname.command(name="remove", aliases=["delete"])
    @commands.check(is_admin)
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def nickname_remove(self, ctx: commands.Context) -> None:
        """ Get rid of Parrot's nickname. """
        await ctx.guild.me.edit(
            nick=None,
            reason=f"Requested by {tag(ctx.author)}",
        )
        await ctx.send("✅ Parrot's nickname has been removed.")


    @commands.command()
    @commands.check(is_admin)
    @commands.guild_only()
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def prefix(self, ctx: commands.Context, *, new_prefix: str | None=None) -> None:
        """ Change the imitation prefix. """
        if new_prefix is not None:  # Set
            # Upsert the new prefix.
            self.bot.db.execute(
                """
                INSERT INTO guilds (id, imitation_prefix)
                VALUES (?, ?)
                ON CONFLICT (id) DO UPDATE
                SET imitation_prefix = EXCLUDED.imitation_prefix
                """,
                (ctx.guild.id, new_prefix)
            )
            await ctx.send(f"✅ Parrot's imitation prefix is now: `{new_prefix}`")
        else:  # Get
            prefix, _ = self.bot.get_guild_prefix_suffix(ctx.guild.id)
            await ctx.send(f"Parrot's imitation prefix is: `{prefix}`")

    @commands.command()
    @commands.check(is_admin)
    @commands.guild_only()
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def suffix(self, ctx: commands.Context, *, new_suffix: str | None=None) -> None:
        """ Change the imitation suffix. """
        if new_suffix is not None:  # Set
            # Upsert the new suffix.
            self.bot.db.execute(
                """
                INSERT INTO guilds (id, imitation_suffix)
                VALUES (?, ?)
                ON CONFLICT (id) DO UPDATE
                SET imitation_suffix = EXCLUDED.imitation_suffix
                """,
                (ctx.guild.id, new_suffix)
            )
            await ctx.send(f"✅ Parrot's imitation suffix is now: `{new_suffix}`")
        else:  # Get
            _, suffix = self.bot.get_guild_prefix_suffix(ctx.guild.id)
            await ctx.send(f"Parrot's imitation suffix is: `{suffix}`")



async def setup(bot: Parrot) -> None:
    await bot.add_cog(Admin(bot))
