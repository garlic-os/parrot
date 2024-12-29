import discord
import sqlmodel as sm

import parrot.db.models as p
from parrot.core.types import Permission, Snowflake
from parrot.utils import cast_not_none

from .types import SubCRUD


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
		statement = sm.select(p.Channel.id).where(
			p.Channel.id == channel.id, getattr(p.Channel, permission) == True
		)
		return self.bot.db_session.exec(statement).first() is not None

	def get_webhook_id(self, channel: discord.TextChannel) -> Snowflake | None:
		statement = sm.select(p.Channel.webhook_id).where(
			p.Channel.id == channel.id
		)
		return self.bot.db_session.exec(statement).first()

	def set_webhook_id(
		self, channel: discord.TextChannel, webhook: discord.Webhook
	) -> None:
		statement = sm.select(p.Channel).where(p.Channel.id == channel.id)
		# not none: Parrot will only ever be making webhooks in channels where
		# it has speaking permission, and so a row for this channel will always
		# already exist in the database.
		db_channel = cast_not_none(self.bot.db_session.exec(statement).first())
		db_channel.webhook_id = webhook.id
		self.bot.db_session.add(db_channel)
		self.bot.db_session.commit()
		self.bot.db_session.refresh(db_channel)
