from discord.ext import commands

from parrot.bot import AbstractParrot

from . import _channel, _guild, _message, _user


class CRUD(commands.Cog):
	""" A pile of Create-Read-Update-Delete functions for Parrot's database """

	def __init__(self, bot: AbstractParrot):
		self.channel = _channel.CRUDChannel(bot)
		self.guild = _guild.CRUDGuild(bot)
		self.message = _message.CRUDMessage(bot)
		self.user = _user.CRUDUser(bot)


async def setup(bot: AbstractParrot) -> None:
	await bot.add_cog(CRUD(bot))
