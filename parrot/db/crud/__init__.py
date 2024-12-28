from parrot.core.semiparrot.crudless import SemiparrotCrudless

from . import _channel, _guild, _member, _message


class CRUD:
	"""A pile of Create-Read-Update-Delete functions for Parrot's database"""

	def __init__(self, bot: SemiparrotCrudless):
		self.channel = _channel.CRUDChannel(bot)
		self.guild = _guild.CRUDGuild(bot)
		self.member = _member.CRUDMember(bot)
		self.message = _message.CRUDMessage(bot, self.channel, self.member)
