import discord
import sqlmodel

import parrot.db.models as p
from parrot.core.types import Permission, SubCRUD


class CRUDChannel(SubCRUD):
	def set_permission_flag(
		self, channel: discord.TextChannel, permission: Permission, value: bool
	) -> bool:
		"""
		Set the value of a Parrot permission flag for a channel.

		:param channel: the channel in question (in DISCORD's format)
		:param permission: the name of the permission to change
		:param value: the new state of the permission flag
		:returns: whether the flag did not already have that value
		"""
		db_channel = self.bot.db_session.get(p.Channel, channel.id)
		if db_channel is not None:
			if getattr(db_channel, permission) == value:
				# Flag already had this value
				return False
			setattr(db_channel, permission, value)
		else:
			db_channel = p.Channel(id=channel.id, **{permission: value})
		self.bot.db_session.add(db_channel)
		self.bot.db_session.commit()
		self.bot.db_session.refresh(db_channel)
		return True

	def has_permission(
		self, channel: discord.TextChannel, permission: Permission
	) -> bool:
		statement = sqlmodel.select(p.Channel.id).where(
			p.Channel.id == channel.id and getattr(p.Channel, permission)
		)
		return self.bot.db_session.exec(statement).first() is not None
