import asyncio
from dataclasses import dataclass
from tempfile import TemporaryFile
from typing import cast

import discord
import ujson
from discord.ext import commands

from parrot.bot import Parrot
from parrot.utils import ParrotEmbed, tag
from parrot.utils.converters import Memberlike
from parrot.utils.exceptions import (
	NoDataError,
	UserNotFoundError,
	UserPermissionError,
)
from parrot.utils.types import AnyUser


class Data(commands.Cog):
	"""Do things w/ ur data"""

	@dataclass
	class Confirmation:
		requestor: AnyUser  # The forget command message's author
		subject_user: AnyUser  # User for whose data to be forgotten

	def __init__(self, bot: Parrot):
		# Key: Message ID of a forget command
		self.pending_confirmations: dict[int, Data.Confirmation] = {}
		self.bot = bot

	@commands.command(aliases=["checkout", "data"])
	@commands.cooldown(2, 3600, commands.BucketType.user)
	async def download(self, ctx: commands.Context) -> None:
		"""Download a copy of your data."""
		user = ctx.author

		# Upload to file.io, a free filesharing service where the file is
		# deleted once it's downloaded.
		# We can't trust that it will fit in a Discord message.
		# TODO: Use a better service, like a self-hosted Pastebin.
		with TemporaryFile("w+", encoding="utf-8") as f:
			ujson.dump(self.bot.crud.user.get_raw(user), f)
			f.seek(0)  # Prepare the file to be read back over
			async with self.bot.http_session.post(
				"https://file.io/", data={"file": f, "expiry": "6h"}
			) as response:
				download_url = (await response.json())["link"]

		# DM the user their download link.
		embed_download_link = ParrotEmbed(
			title="Link to download your data",
			description=download_url,
		)
		embed_download_link.set_footer(text="Link expires in 6 hours.")
		asyncio.create_task(
			user.send(embed=embed_download_link)
		)  # No need to wait

		# Tell them to check their DMs.
		embed_download_ready = ParrotEmbed(
			title="Download ready",
			color_name=ParrotEmbed.Color.Green,
			description="A link to download your data has been DM'd to you.",
		)
		await ctx.send(embed=embed_download_ready)

	@commands.command(aliases=["pfp", "profilepic", "profilepicture"])
	@commands.cooldown(2, 4, commands.BucketType.user)
	async def avatar(
		self, ctx: commands.Context, who: Memberlike | None = None
	) -> None:
		"""Show your Imitate Clone's avatar."""
		who_ = cast(discord.Member | None, who)
		if who_ is None:
			who_ = cast(discord.Member, ctx.author)
		avatar_url = await self.bot.antiavatars.fetch(who_)
		await ctx.send(avatar_url)

	@commands.group()
	@commands.cooldown(2, 4, commands.BucketType.user)
	async def forget(
		self,
		ctx: commands.Context,
		who: str | None = None,
		*args,  # noqa: ANN002  im begging you please dont make me type annotate
		**kwargs,  # noqa: ANN003  another var arg
	) -> None:
		"""Delete all the data Parrot has about you."""
		if who is not None:
			try:
				who_ = await Memberlike().convert(ctx, who)
			except UserNotFoundError:
				for command in self.forget.commands:
					if command.name == who:
						await command(ctx, *args, **kwargs)
						return
				raise
		else:
			who_ = ctx.author

		if (
			who_ != ctx.author
			and self.bot.owner_ids is not None
			and ctx.author.id not in self.bot.owner_ids
		):
			raise UserPermissionError(
				"You are not allowed to make Parrot forget other users."
			)

		if not self.bot.crud.user.exists(who_):
			raise NoDataError(f"No data available for user {tag(who_)}.")

		confirm_code = ctx.message.id

		# Keep track of this confirmation while it's still pending.
		self.pending_confirmations[confirm_code] = Data.Confirmation(
			requestor=ctx.author,
			subject_user=who_,
		)

		embed = ParrotEmbed(
			title="Are you sure?",
			color_name=ParrotEmbed.Color.Orange,
			description=(
				f"This will permantently delete the data of {tag(who_)}.\n"
				"To confirm, paste the following command:\n"
				f"`{self.bot.command_prefix}forget confirm {confirm_code}`"
			),
		)
		embed.set_footer(
			text="Action will be automatically canceled in 1 minute."
		)

		await ctx.send(embed=embed, reference=ctx.message)

		# Delete the confirmation after 1 minute.
		await asyncio.sleep(60)
		try:
			del self.pending_confirmations[confirm_code]
		except KeyError:
			pass

	@forget.command(name="confirm", hidden=True)
	@commands.cooldown(2, 4, commands.BucketType.user)
	async def forget_confirm(
		self, ctx: commands.Context, confirm_code: int
	) -> None:
		# You'd think that since this argument is typed as an int, it would come
		# in as an int. But noooo, it comes in as a string
		confirm_code = int(confirm_code)
		confirmation = self.pending_confirmations.get(confirm_code, None)

		if confirmation is not None and confirmation.requestor == ctx.author:
			user = confirmation.subject_user

			# Delete this user's data.
			self.bot.crud.user.delete_all_data(user)

			# Invalidate this confirmation code.
			del self.pending_confirmations[confirm_code]

			await ctx.send(
				embed=ParrotEmbed(
					title=f"Parrot has forgotten {tag(user)}.",
					color_name=ParrotEmbed.Color.Gray,
					description=(
						"All of the data that Parrot has collected from this "
						"user has been deleted."
					),
				),
				reference=ctx.message,
			)
		else:
			await ctx.send(f"Confirmation code `{confirm_code}` is invalid.")


async def setup(bot: Parrot) -> None:
	await bot.add_cog(Data(bot))
