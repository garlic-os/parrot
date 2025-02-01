import logging
import random

import discord
from discord.ext import commands

from parrot import config, utils
from parrot.bot import Parrot
from parrot.utils import cast_not_none, tag, weasel
from parrot.utils.exceptions import NotRegisteredError


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
		if message.content == "ayy" and config.ayy_lmao:
			await message.channel.send("lmao")

		if not isinstance(message.channel, discord.TextChannel):
			return

		# Ignore NotRegisteredErrors; Parrot shouldn't learn from non-registered
		# users, anyway.
		try:
			recorded = self.bot.crud.message.record(message)
			if len(recorded) > 0:
				logging.info(
					f"Collected a message (ID: {message.id}) from user "
					f"{tag(message.author)} (ID: {message.author.id})"
				)
			# member = cast(discord.Member, message.author)
			# corpus_update = (message.content for message in recorded)
			# asyncio.create_task(self.bot.markov_models.update(member, corpus_update))
		except NotRegisteredError:
			pass

		# Randomly decide to wawa a message.
		if (
			random.random() < config.random_wawa_chance
			and self.bot.crud.user.wants_wawa(message.author)
		):
			text = utils.find_text(message)
			await message.reply(await weasel.wawa(text), silent=True)


async def setup(bot: Parrot) -> None:
	await bot.add_cog(MessageEventHandler(bot))
