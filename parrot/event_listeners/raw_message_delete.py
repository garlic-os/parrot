import logging

import discord
from discord.ext import commands

from parrot.bot import Parrot


class RawMessageDeleteEventHandler(commands.Cog):
	def __init__(self, bot: Parrot):
		self.bot = bot

	# Update the database when a message is deleted.
	# Must use the raw event because the main event doesn't catches edit events
	# for messages that happen to be in its cache.
	@commands.Cog.listener()
	async def on_raw_message_delete(
		self, event: discord.RawMessageDeleteEvent
	) -> None:
		self.bot.crud.message.delete(event.message_id)
		logging.info(
			f"Forgot message with ID {event.message_id} because it was deleted "
			"from Discord."
		)


async def setup(bot: Parrot) -> None:
	await bot.add_cog(RawMessageDeleteEventHandler(bot))
