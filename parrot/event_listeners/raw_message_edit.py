import logging

import discord
from discord.ext import commands

from bot import AbstractParrot


class RawMessageEditEventHandler(commands.Cog):
	def __init__(self, bot: AbstractParrot):
		self.bot = bot

	# Update the database when a message is edited.
	# Must use the raw event because the main event doesn't catches edit events
	# for messages that happen to be in its cache.
	@commands.Cog.listener()
	async def on_raw_message_edit(
		self, event: discord.RawMessageUpdateEvent
	) -> None:
		if "content" not in event.data:
			logging.error(f"Unexpected message edit event format: {event.data}")
			return
		success = self.bot.crud.message.edit(
			event.message_id, event.data["content"]
		)
		if not success:
			channel = self.bot.get_channel(event.channel_id)
			if not isinstance(channel, discord.TextChannel):
				return
			message = await channel.fetch_message(event.message_id)
			self.bot.crud.message.record(message)


async def setup(bot: AbstractParrot) -> None:
	await bot.add_cog(RawMessageEditEventHandler(bot))
