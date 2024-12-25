from parrot.core.pbwc import ParrotButWithoutCRUD

from . import _channel, _guild, _message, _user


class CRUD:
	"""A pile of Create-Read-Update-Delete functions for Parrot's database"""

	def __init__(self, bot: ParrotButWithoutCRUD):
		self.channel = _channel.CRUDChannel(bot)
		self.guild = _guild.CRUDGuild(bot)
		self.user = _user.CRUDUser(bot)
		self.message = _message.CRUDMessage(bot, self.channel, self.user)
