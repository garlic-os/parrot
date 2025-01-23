from collections.abc import Sequence

import discord
import sqlmodel as sm

import parrot.db.models as p
from parrot.utils.exceptions import NotRegisteredError

from .types import SubCRUD


class CRUDMember(SubCRUD):
	def set_registered(self, member: discord.Member, value: bool) -> None:
		statement = sm.select(p.MemberGuildLink).where(
			p.MemberGuildLink.member_id == member.id,
			p.MemberGuildLink.guild_id == member.guild.id,
		)
		guild_link = self.bot.db_session.exec(statement).first()
		if guild_link is None:
			guild_link = p.MemberGuildLink(
				member_id=member.id, guild_id=member.guild.id
			)
			# If a member-guild link does not exist in the database, then that
			# may mean this guild doesn't exist in the database either, in which
			# case, now is the time to insert it.
			if self.bot.db_session.get(p.Guild, member.guild.id) is None:
				self.bot.db_session.add(p.Guild(id=member.guild.id))
		guild_link.is_registered = value
		self.bot.db_session.add(guild_link)
		self.bot.db_session.commit()
		# self.bot.db_session.refresh(guild_link)

	def assert_registered(self, member: discord.Member) -> None:
		if self.is_registered(member):
			raise NotRegisteredError(member)

	def is_registered(self, member: discord.Member) -> bool:
		if member.bot:  # Bots are always counted as registered
			return True
		statement = sm.select(p.MemberGuildLink).where(
			p.MemberGuildLink.member_id == member.id,
			p.MemberGuildLink.guild_id == member.guild.id,
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
		self.assert_registered(member)
		statement = sm.select(p.Message.content).where(
			p.Message.author_id == member.id,
			p.Message.guild_id == member.guild.id,
		)
		return self.bot.db_session.exec(statement).all()

	def get_avatar_info(self, member: discord.Member) -> p.AvatarInfo | None:
		self.assert_registered(member)
		statement = sm.select(p.AvatarInfo).where(
			p.AvatarInfo.member_id == member.id,
			p.AvatarInfo.guild_id == member.guild.id,
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
