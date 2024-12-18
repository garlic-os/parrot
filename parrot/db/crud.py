import discord
import sqlmodel
from sqlalchemy import ScalarResult

import parrot.db.models as p
from parrot.core.types import Permission, Snowflake


class CRUD:
	"""
	A series of Create-Read-Update-Delete functions for Parrot's database
	curried with a SQLmodel database session.
	"""
	session: sqlmodel.Session

	def __init__(self, session: sqlmodel.Session):
		self.session = session

	# def channel_get_permission_flag(self, channel: discord.TextChannel, permission: ChannelPermission) -> bool:
	# 	statement = sqlmodel \
	# 		.select(p.Channel) \
	# 		.where(p.Channel.id == channel.id)
	# 	db_channel = self.session.exec(statement).first()
	# 	if db_channel is None:
	# 		return False
	# 	return getattr(db_channel, permission)

	def guild_get_channel_ids_with_permission(self, guild: discord.Guild, permission: Permission) -> ScalarResult[Snowflake]:
		statement = sqlmodel \
			.select(p.Channel.id) \
			.where(p.Channel.guild_id == guild.id and getattr(p.Channel, permission))
		return self.session.exec(statement)

	def channel_set_permission_flag(
		self,
		channel: discord.TextChannel,
		permission: Permission,
		value: bool
	) -> bool:
		"""
		Set the value of a Parrot permission flag for a channel.
		
		:param channel: the channel in question (in DISCORD's format)
		:param permission: the name of the permission to change
		:param value: the new state of the permission flag
		:returns: whether the flag did not already have that value
		"""
		statement = sqlmodel \
			.select(p.Channel) \
			.where(p.Channel.id == channel.id)
		db_channel = self.session.exec(statement).first()
		if db_channel is not None:
			if getattr(db_channel, permission) == value:
				# Flag already had this value
				return False
			setattr(db_channel, permission, value)
		else:
			db_channel = p.Channel(id=channel.id, **{permission: value})
		self.session.add(db_channel)
		self.session.commit()
		self.session.refresh(db_channel)
		return True

	# Resisting the urge not to consolidate this into "get_affix/set_affix"
	def get_prefix(self, guild: discord.Guild) -> str:
		statement = sqlmodel \
			.select(p.Guild.imitation_prefix) \
			.where(p.Guild.id == guild.id)
		return self.session.exec(statement).first() or \
			p.GuildMeta.default_imitation_prefix.value
	
	def set_prefix(self, guild: discord.Guild, new_prefix: str) -> None:
		statement = sqlmodel \
			.select(p.Guild) \
			.where(p.Guild.id == guild.id)
		db_guild = self.session.exec(statement).first()
		if db_guild is not None:
			db_guild.imitation_prefix = new_prefix
		else:
			db_guild = p.Guild(id=guild.id, imitation_prefix=new_prefix)
		self.session.add(db_guild)
		self.session.commit()
		self.session.refresh(db_guild)

	def get_suffix(self, guild: discord.Guild) -> str:
		statement = sqlmodel \
			.select(p.Guild.imitation_suffix) \
			.where(p.Guild.id == guild.id)
		return self.session.exec(statement).first() or \
			p.GuildMeta.default_imitation_suffix.value
	
	def set_suffix(self, guild: discord.Guild, new_suffix: str) -> None:
		statement = sqlmodel \
			.select(p.Guild) \
			.where(p.Guild.id == guild.id)
		db_guild = self.session.exec(statement).first()
		if db_guild is not None:
			db_guild.imitation_suffix = new_suffix
		else:
			db_guild = p.Guild(id=guild.id, imitation_suffix=new_suffix)
		self.session.add(db_guild)
		self.session.commit()
		self.session.refresh(db_guild)
