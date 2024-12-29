from typing import TYPE_CHECKING

from . import _channel, _guild, _member, _message, _user


if TYPE_CHECKING:
	from parrot.bot import Parrot

class CRUD:
	"""A pile of Create-Read-Update-Delete functions for Parrot's database"""

	def __init__(self, bot: Parrot):
		self.channel = _channel.CRUDChannel(bot)
		self.guild = _guild.CRUDGuild(bot)
		self.member = _member.CRUDMember(bot)
		self.user = _user.CRUDUser(bot)
		self.message = _message.CRUDMessage(bot, self.channel, self.member)
