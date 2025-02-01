import asyncio

import discord
import sqlmodel as sm
from sqlalchemy import ScalarResult

import parrot.db.models as p
from parrot.utils.types import Permission, Snowflake

from .types import SubCRUD


class CRUDGuild(SubCRUD):
	def get_channel_ids_with_permission(
		self, guild: discord.Guild, permission: Permission
	) -> ScalarResult[Snowflake]:
		statement = sm.select(p.Channel.id).where(
			p.Channel.guild_id == guild.id,
			getattr(p.Channel, permission) == True,
			# TODO: does this work?
			# getattr(p.Channel, permission),
		)
		return self.bot.db_session.exec(statement)

	def get_prefix(self, guild: discord.Guild) -> str:
		statement = sm.select(p.Guild.imitation_prefix).where(
			p.Guild.id == guild.id
		)
		return (
			self.bot.db_session.exec(statement).first()
			or p.GuildMeta.default_imitation_prefix
		)

	def set_prefix(self, guild: discord.Guild, new_prefix: str) -> None:
		db_guild = self.bot.db_session.get(p.Guild, guild.id) or p.Guild(
			id=guild.id, imitation_prefix=new_prefix
		)
		db_guild.imitation_prefix = new_prefix
		self.bot.db_session.add(db_guild)
		self.bot.db_session.commit()
		self.bot.db_session.refresh(db_guild)

	def get_suffix(self, guild: discord.Guild) -> str:
		statement = sm.select(p.Guild.imitation_suffix).where(
			p.Guild.id == guild.id
		)
		return (
			self.bot.db_session.exec(statement).first()
			or p.GuildMeta.default_imitation_suffix
		)

	def set_suffix(self, guild: discord.Guild, new_suffix: str) -> None:
		db_guild = self.bot.db_session.get(p.Guild, guild.id) or p.Guild(
			id=guild.id, imitation_suffix=new_suffix
		)
		db_guild.imitation_suffix = new_suffix
		self.bot.db_session.add(db_guild)
		self.bot.db_session.commit()
		self.bot.db_session.refresh(db_guild)

	async def get_registered_members(
		self, guild: discord.Guild
	) -> list[discord.Member]:
		db_guild = self.bot.db_session.get(p.Guild, guild.id)
		if db_guild is None:
			return []
		return await asyncio.gather(
			*(
				guild.fetch_member(link.member.id)
				for link in db_guild.member_links
			)
		)
