import discord
import sqlmodel

import parrot.db.models as p
from parrot.config import settings
from parrot.core.exceptions import NotRegisteredError
from parrot.core.types import AnyUser, SubCRUD


class CRUDUser(SubCRUD):
	def _get_registration(
		self, user: AnyUser, guild: discord.Guild
	) -> p.Registration | None:
		statement = sqlmodel.select(p.Registration).where(
			p.Registration.user_id == user.id and p.Guild.id == guild.id
		)
		return self.bot.db_session.exec(statement).first()

	def set_registered(
		self, user: AnyUser, guild: discord.Guild, value: bool
	) -> None:
		if value:
			registration = p.Registration(user_id=user.id, guild_id=guild.id)
			self.bot.db_session.add(registration)
		else:
			registration = self._get_registration(user, guild)
			self.bot.db_session.delete(registration)
		self.bot.db_session.commit()
		self.bot.db_session.refresh(registration)

	def assert_registered(self, user: AnyUser, guild: discord.Guild) -> None:
		if self.is_registered(user, guild):
			raise NotRegisteredError(
				f"User {user.mention} is not opted in to Parrot. To opt in, do "
				f"the `{settings.command_prefix}register` command."
			)

	def is_registered(self, user: AnyUser, guild: discord.Guild) -> bool:
		if user.bot:  # Bots are always counted as registered
			return True
		return self._get_registration(user, guild) is not None
