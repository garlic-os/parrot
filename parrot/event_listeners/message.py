import logging
# import random

import discord
from discord.ext import commands

from parrot.bot import Parrot
from parrot.config import settings
from parrot.core.exceptions import NotRegisteredError
# from parrot.utils import cast_not_none, tag, weasel
from parrot.utils import cast_not_none, tag


class MessageEventHandler(commands.Cog):
	def __init__(self, bot: Parrot):
		self.bot = bot

	@commands.Cog.listener()
	async def on_message(self, message: discord.Message) -> None:
		"""
		Handle receiving messages.
		Monitors messages of registered users.
		"""
		if message.author.id == cast_not_none(self.bot.user).id:
			return

		# I am a mature person making a competent Discord bot.
		if message.content == "ayy" and settings.ayy_lmao:
			await message.channel.send("lmao")

		# Ignore NotRegisteredErrors; Parrot shouldn't learn from non-registered
		# users, anyway.
		try:
			learned_count = self.bot.crud.message.record(message)
			if learned_count:
				logging.info(
					f"Collected a message (ID: {message.id}) from user "
					f"{tag(message.author)} (ID: {message.author.id})"
				)
		except NotRegisteredError:
			pass

		# Randomly decide to devolve a message.
		# if random.random() < config.RANDOM_DEVOLVE_CHANCE:
		#     text = self.bot.find_text(message)
		#     await message.reply(
		#         await weasel.wawa(text),
		#         silent=True
		#     )

		# Imitate again when someone replies to an imitate message.
		# if message.reference is not None:
		#     src_message = await message.channel.fetch_message(
		#         message.reference.message_id
		#     )
		#     if (src_message is not None and
		#         src_message.webhook_id is not None and
		#         src_message.channel.id in self.bot.speaking_channels):
		#         try:
		#             # HACK: Get the ID of the user Parrot imitated in this
		#             # message through the message's AVATAR URL.
		#             # Really relying on implementation quirks here, but I don't
		#             # want to put in the effort to, like, log which messages
		#             # imitate who or something like that to be able to do this
		#             # properly.
		#             # If Discord ever changes the structure of their avatar URLs
		#             # or if I change Parrot to use different avatars, this will
		#             # probably break. But I guess now we'll just cross that
		#             # bridge when it comes.
		#             avatar_url = str(src_message.author.avatar.url)
		#             user_id = avatar_url.split("/")[4]
		#             message.content = user_id
		#             ctx = await self.bot.get_context(message)
		#             imitate_command = self.bot.get_command("imitate")
		#             await imitate_command.prepare(ctx)
		#             await imitate_command(ctx, user_id)
		#         except Exception as e:
		#             # Don't try to make amends if this feature fails. It isn't
		#             # that important.
		#             pass


async def setup(bot: Parrot) -> None:
	await bot.add_cog(MessageEventHandler(bot))
