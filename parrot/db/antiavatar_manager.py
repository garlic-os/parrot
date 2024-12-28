import asyncio
import logging
import urllib.parse
from pathlib import Path
from typing import Self

import discord

import parrot.db.models as p
from parrot.config import settings
from parrot.core.semiparrot.managerless import SemiparrotManagerless
from parrot.core.types import Snowflake
from parrot.utils import image


class AntiavatarManager:
	"""
	A cache layer over Parrot's "antiavatars" that it uses when it imitates.

	Stores generated images in a channel on Discord and keeps the necessary
	information locally to retrieve them.

	Works with respect to Discord MEMBERS, i.e., to instances of users per
	guild. This way guild-specific avatars can be honored.
	"""

	avatar_channel: discord.TextChannel

	def __init__(self, bot: SemiparrotManagerless):
		"""dont run this directly please use .new() instead"""
		self.bot = bot

	@classmethod
	async def new(cls, bot: SemiparrotManagerless) -> Self:
		self = cls(bot)
		avatar_channel = await self.bot.fetch_channel(
			settings.avatar_store_channel_id
		)
		if not isinstance(avatar_channel, discord.TextChannel):
			raise TypeError(
				"Invalid channel type for the avatar store: "
				f"{self.avatar_channel}. The provided channel for storing "
				"avatars must be a regular TextChannel."
			)
		self.avatar_channel = avatar_channel
		return self

	async def fetch(self, member: discord.Member) -> str:
		info = self.bot.crud.member.get_avatar_info(member)

		has_preexisting_antiavatar = info is not None
		if has_preexisting_antiavatar:
			# Parrot has made an antiavatar for this member before
			# member.display_avatar: "For regular members this is just their
			# avatar, but if they have a guild specific avatar then that is
			# returned instead."
			has_changed_avatar = AntiavatarManager._url_id(
				member.display_avatar.url
			) == AntiavatarManager._url_id(info.original_avatar_url)
			if not has_changed_avatar:
				# Use the cached antiavatar.
				return info.antiavatar_url

			# Else, user has changed their avatar here; respect the user's
			# privacy by deleting the message with their old avatar.
			# (This operation doesn't need to complete before continuing)
			asyncio.create_task(
				self._delete_message(info.antiavatar_message_id)
			)

		# User has changed their avatar in this guild since last time they did
		# |imitate, and/or Parrot has never made the antiavatar for this avatar,
		# so we must create this avatar's anti.
		antiavatar = await image.create_antiavatar(member)

		# Post the new antiavatar to the "avatar store" Discord channel.
		message = await self.avatar_channel.send(
			file=discord.File(
				antiavatar.buffer, f"{member.id}.{antiavatar.file_ext}"
			)
		)

		# Record the information to access it later.
		self.bot.crud.member.set_avatar_info(
			member,
			p.AvatarInfoCreate(
				antiavatar_message_id=message.id,
				antiavatar_url=message.attachments[0].url,
				original_avatar_url=member.display_avatar.url,
			),
		)
		return message.attachments[0].url

	async def _delete_message(self, message_id: Snowflake) -> None:
		try:
			message = await self.avatar_channel.fetch_message(message_id)
		except discord.NotFound:
			logging.warning(
				f"Tried to delete message {message_id} from the avatar store, "
				"but it doesn't exist."
			)
		else:
			await message.delete()

	@staticmethod
	def _url_id(url: str) -> str:
		path = urllib.parse.urlparse(url).path
		return Path(path).suffix
