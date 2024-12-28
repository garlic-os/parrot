from collections.abc import Sequence

import discord
import sqlmodel as sm

import parrot.db.models as p
from parrot.core.exceptions import NotRegisteredError

from .types import SubCRUD


class CRUDMember(SubCRUD):
	def _get_registration(
		self, member: discord.Member
	) -> p.Registration | None:
		statement = sm.select(p.Registration).where(
			p.Registration.member_id == member.id
			and p.Guild.id == member.guild.id
		)
		return self.bot.db_session.exec(statement).first()

	def set_registered(self, member: discord.Member, value: bool) -> None:
		if value:
			registration = p.Registration(
				member_id=member.id, guild_id=member.guild.id
			)
			self.bot.db_session.add(registration)
		else:
			registration = self._get_registration(member)
			self.bot.db_session.delete(registration)
		self.bot.db_session.commit()
		self.bot.db_session.refresh(registration)

	def assert_registered(self, member: discord.Member) -> None:
		if self.is_registered(member):
			raise NotRegisteredError(member)

	def is_registered(self, member: discord.Member) -> bool:
		if member.bot:  # Bots are always counted as registered
			return True
		statement = sm.select(p.Registration.member_id).where(
			p.Registration.member_id == member.id
			and p.Guild.id == member.guild.id
		)
		return self.bot.db_session.exec(statement).first() is not None

	# def get_messages(self, member: discord.Member) -> Sequence[p.Message]:
	# 	statement = sm.select(p.Message).where(
	# 		p.Message.member_id == member.id
	# 		and p.Message.guild_id == member.guild.id
	# 	)
	# 	return self.bot.db_session.exec(statement).all()

	def get_messages_content(self, member: discord.Member) -> Sequence[str]:
		"""
		Get the text content of every message this user has said in this guild.
		"""
		statement = sm.select(p.Message.content).where(
			p.Message.member_id == member.id
			and p.Message.guild_id == member.guild.id
		)
		return self.bot.db_session.exec(statement).all()

	def get_avatar_info(self, member: discord.Member) -> p.AvatarInfo | None:
		self.assert_registered(member)
		statement = sm.select(p.AvatarInfo).where(
			p.AvatarInfo.member_id == member.id
			and p.AvatarInfo.guild_id == member.guild.id
		)
		return self.bot.db_session.exec(statement).first()

	def set_avatar_info(
		self, member: discord.Member, avatar_info_in: p.AvatarInfoCreate
	) -> None:
		avatar_info = p.AvatarInfo(
			member_id=member.id,
			guild_id=member.guild.id,
			antiavatar_url=avatar_info_in.antiavatar_url,
			antiavatar_message_id=avatar_info_in.antiavatar_message_id,
			original_avatar_url=avatar_info_in.original_avatar_url,
		)
		self.bot.db_session.add(avatar_info)
		# self.bot.db_session.commit()
		# self.bot.db_session.refresh(avatar_info)
