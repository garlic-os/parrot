import discord
from discord.ext import commands

import parrot.db.models as p
from parrot.bot import AbstractParrot
from parrot.core.types import Permission
from parrot.utils import Paginator, cast_not_none, checks, tag
from parrot.utils.parrot_embed import ParrotEmbed


class Admin(commands.Cog):
	def __init__(self, bot: AbstractParrot):
		self.bot = bot


	@commands.command()
	@commands.check(checks.is_admin)
	@commands.cooldown(2, 4, commands.BucketType.user)
	async def delete(self, ctx: commands.Context, message_id: int) -> None:
		""" Delete a message that Parrot sent (including imitation messages). """
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
		# "type: ignore" for "expected 1 more positional argument"
		# discord.py itself had to do this too:
		# https://github.com/Rapptz/discord.py/blob/4e03b17/discord/ext/commands/core.py#L588-L590
		await cast_not_none(self.bot.get_command("help")).callback(
			ctx,
			command=cast_not_none(ctx.command.qualified_name),  # type: ignore
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
		channel: discord.TextChannel | None=None,
	) -> None:
		""" Manage Parrot's channel permissions. """
		if action is None:
			await self.send_help(ctx)


	@channel.group(
		aliases=["enable"],
		brief="Let Parrot learn or speak in a channel.",
		invoke_without_command=True,
	)
	@commands.check(checks.is_admin)
	async def add(
		self,
		ctx: commands.Context,
		channel_type: str | None=None,
		channel: discord.TextChannel | None=None,
	) -> None:
		""" Give Parrot learning or speaking permission in a new channel. """
		if channel_type is None:
			await self.send_help(ctx)

	@add.command(
		name="learning",
		brief="Let Parrot learn in a new channel."
	)
	async def add_learning(
		self,
		ctx: commands.Context,
		channel: discord.TextChannel
	) -> None:
		"""
		Give Parrot permission to learn in a new channel.
		Parrot will start to collect messages from registered users in this
		channel.
		"""
		changed = self.bot.crud \
			.channel_set_permission_flag(channel, "can_learn_here", True)
		if changed:
			await ctx.send(f"✅ Now learning in {channel.mention}.")
		else:
			await ctx.send(f"⚠️️ Already learning in {channel.mention}!")


	@add.command(
		name="speaking",
		brief="Let Parrot speak in a new channel."
	)
	async def add_speaking(
		self,
		ctx: commands.Context,
		channel: discord.TextChannel
	) -> None:
		"""
		Give Parrot permission to speak in a new channel.
		Parrot will be able to imitate people in this channel.
		"""
		changed = self.bot.crud \
			.channel_set_permission_flag(channel, "can_speak_here", True)
		if changed:
			await ctx.send(f"✅ Now able to speak in {channel.mention}.")
		else:
			await ctx.send(f"⚠️️ Already able to speak in {channel.mention}!")


	@channel.group(
		aliases=["disable", "delete"],
		brief="Remove Parrot's learning or speaking permission somewhere.",
		invoke_without_command=True,
	)
	@commands.check(checks.is_admin)
	async def remove(
		self,
		ctx: commands.Context,
		channel_type: str | None=None,
		channel: discord.TextChannel | None=None,
	) -> None:
		""" Remove Parrot's learning or speaking permission in a channel. """
		if channel_type is None:
			await self.send_help(ctx)

	@remove.command(
		name="learning",
		brief="Remove Parrot's learning permission in a channel."
	)
	async def remove_learning(
		self,
		ctx: commands.Context,
		channel: discord.TextChannel
	) -> None:
		"""
		Remove Parrot's permission to learn in a channel.
		Parrot will stop collecting messages in this channel.
		"""
		changed = self.bot.crud \
			.channel_set_permission_flag(channel, "can_learn_here", False)
		if changed:
			await ctx.send(f"❌ No longer learning in {channel.mention}.")
		else:
			await ctx.send(f"⚠️️ Already not learning in {channel.mention}!")

	@remove.command(
		name="speaking",
		brief="Remove Parrot's speaking permission in a channel."
	)
	async def remove_speaking(
		self,
		ctx: commands.Context,
		channel: discord.TextChannel
	) -> None:
		"""
		Remove Parrot's permission to speak in a channel.
		Parrot will no longer be able to imitate people in this channel.
		"""
		changed = self.bot.crud \
			.channel_set_permission_flag(channel, "can_speak_here", False)
		if changed:
			await ctx.send(f"❌ No longer able to speak in {channel.mention}.")
		else:
			await ctx.send(f"⚠️️ Already not able to speak in {channel.mention}!")


	@channel.group(invoke_without_command=True)
	async def view(self, ctx: commands.Context, channel_type: str | None=None) -> None:
		""" View the channels Parrot can speak or learn in. """
		if channel_type is None:
			await self.send_help(ctx)

	async def do_view_channels(
		self, *,
		ctx: commands.Context,
		permission: Permission,
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
		if guild is None:
			await ctx.send(failure_message)
			return

		ids = self.bot.crud.guild_get_channel_ids_with_permission(guild, permission)
		channel_mentions = [c.mention for c in guild.channels if c.id in ids]

		embed = ParrotEmbed(title=message)
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
	async def view_learning(self, ctx: commands.Context, guild_id: int | None=None) -> None:
		""" View the channels Parrot is learning from. """
		await self.do_view_channels(
			ctx=ctx,
			permission="can_learn_here",
			guild_id=guild_id,
			message="Parrot is learning from these channels:",
			failure_message="Parrot can't speak in DMs. Try passing in a guild ID."
		)

	@view.command(name="speaking")
	async def view_speaking(self, ctx: commands.Context, guild_id: int | None=None) -> None:
		""" View the channels Parrot can imitate people in. """
		await self.do_view_channels(
			ctx=ctx,
			permission="can_speak_here",
			guild_id=guild_id,
			message="Parrot can speak in these channels:",
			failure_message="Parrot can't speak in DMs. Try passing in a guild ID."
		)


	@commands.group(invoke_without_command=True)
	@commands.cooldown(2, 4, commands.BucketType.user)
	@commands.check(checks.is_admin)
	async def nickname(self, ctx: commands.Context, action: str | None=None) -> None:
		""" Manage Parrot's nickname. """
		if action is None:
			await self.send_help(ctx)

	@nickname.command(name="set")
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
		if ctx.guild is None:
			await ctx.send("Discord nicknames are only available in servers.")
			return

		await ctx.guild.me.edit(
			nick=new_nick,
			reason=f"Requested by {tag(ctx.author)}",
		)
		await ctx.send(f"✅ Parrot's nickname is now: {ctx.guild.me.nick}")

	@nickname.command(name="remove", aliases=["delete"])
	async def nickname_remove(self, ctx: commands.Context) -> None:
		""" Get rid of Parrot's nickname. """
		if ctx.guild is None:
			await ctx.send("Discord nicknames are only available in servers.")
			return
		await ctx.guild.me.edit(
			nick=None,
			reason=f"Requested by {tag(ctx.author)}",
		)
		await ctx.send("✅ Parrot's nickname has been removed.")


	@commands.group(invoke_without_command=True)
	@commands.guild_only()
	@commands.cooldown(2, 4, commands.BucketType.user)
	async def prefix(self, ctx: commands.Context, action: str | None=None, new_prefix: str | None=None) -> None:
		""" Manage Parrot's imitation prefix for this server. """
		if action is not None and action != "get":
			await self.send_help(ctx)
			return
		await self.prefix_get(ctx)
	
	@prefix.command()
	async def prefix_get(self, ctx: commands.Context) -> None:
		# ctx.guild guaranteed not None because this command group is guild-only
		prefix = self.bot.crud.get_prefix(cast_not_none(ctx.guild))
		await ctx.send(f"Parrot's imitation prefix is: `{prefix}`")

	@prefix.command()
	@commands.check(checks.is_admin)
	async def prefix_set(self, ctx: commands.Context, new_prefix: str) -> None:
		self.bot.crud.set_prefix(cast_not_none(ctx.guild), new_prefix)
		await ctx.send(f"✅ Parrot's imitation prefix is now: `{new_prefix}`")

	
	@prefix.command(aliases=["reset", "default"])
	@commands.check(checks.is_admin)
	async def prefix_clear(self, ctx: commands.Context) -> None:
		new_prefix = p.GuildMeta.default_imitation_prefix.value
		self.bot.crud.set_prefix(cast_not_none(ctx.guild), new_prefix)
		await ctx.send(f"✅ Parrot's imitation prefix has been reset to: `{new_prefix}`")

	@commands.group(invoke_without_command=True)
	@commands.guild_only()
	@commands.cooldown(2, 4, commands.BucketType.user)
	async def suffix(self, ctx: commands.Context, action: str | None=None, new_suffix: str | None=None) -> None:
		""" Manage Parrot's imitation suffix for this server. """
		if action is not None and action != "get":
			await self.send_help(ctx)
			return
		await self.suffix_get(ctx)
	
	@suffix.command()
	async def suffix_get(self, ctx: commands.Context) -> None:
		# ctx.guild guaranteed not None because this command group is guild-only
		suffix = self.bot.crud.get_suffix(cast_not_none(ctx.guild))
		await ctx.send(f"Parrot's imitation suffix is: `{suffix}`")

	@suffix.command()
	@commands.check(checks.is_admin)
	async def suffix_set(self, ctx: commands.Context, new_suffix: str) -> None:
		self.bot.crud.set_suffix(cast_not_none(ctx.guild), new_suffix)
		await ctx.send(f"✅ Parrot's imitation suffix is now: `{new_suffix}`")

	
	@suffix.command(aliases=["reset", "default"])
	@commands.check(checks.is_admin)
	async def suffix_clear(self, ctx: commands.Context) -> None:
		new_suffix = p.GuildMeta.default_imitation_suffix.value
		self.bot.crud.set_suffix(cast_not_none(ctx.guild), new_suffix)
		await ctx.send(f"✅ Parrot's imitation suffix has been reset to: `{new_suffix}`")



async def setup(bot: AbstractParrot) -> None:
	await bot.add_cog(Admin(bot))
