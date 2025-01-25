import asyncio
from typing import TYPE_CHECKING, Any

import sqlmodel as sm

import parrot.db.models as p
from parrot.utils import cast_not_none
from parrot.utils.types import AnyUser

from .types import SubCRUD


if TYPE_CHECKING:
	from parrot.bot import Parrot


class CRUDUser(SubCRUD):
	"""Methods that pertain to the Member table but are Guild-agnostic"""

	def __init__(self, bot: "Parrot"):
		super().__init__(bot)

	def wants_wawa(self, user: AnyUser) -> bool:
		statement = sm.select(p.Member.wants_random_wawa).where(
			p.Member.id == user.id
		)
		return self.bot.db_session.exec(statement).first() or False

	def toggle_random_wawa(self, user: AnyUser) -> bool:
		"""
		Toggle your "wants random wawa" setting globally.
		Returns new state.
		"""
		db_member = cast_not_none(self.bot.db_session.get(p.Member, user.id))
		db_member.wants_random_wawa = not db_member.wants_random_wawa
		self.bot.db_session.add(db_member)
		self.bot.db_session.commit()
		return db_member.wants_random_wawa

	def get_raw(self, user: AnyUser) -> dict[str, Any] | None:
		db_member = self.bot.db_session.get(p.Member, user.id)
		if db_member is None:
			return None
		# TODO: this dumps the relationships too, right?
		#       How many levels deep?
		return db_member.model_dump(mode="json")

	def exists(self, user: AnyUser) -> bool:
		"""Search Parrot's database for any trace of this user."""
		return self.bot.db_session.get(p.Member, user.id) is not None

	async def delete_all_data(self, user: AnyUser) -> bool:
		"""
		Delete ALL the data associated with a Member.
		You better be sure calling this method!
		"""
		db_member = self.bot.db_session.get(p.Member, user.id)
		if db_member is None:
			return False

		# Delete their avatars
		await asyncio.gather(
			*(
				self.bot.antiavatars.delete_antiavatar(avatar_info)
				for avatar_info in db_member.avatars
			)
		)

		# Delete any of their Markov models from the cache
		for db_guild_link in db_member.guild_links:
			try:
				del self.bot.markov_models.cache[
					(db_member.id, db_guild_link.guild.id)
				]
			except KeyError:
				pass

		# Delete all their database information
		self.bot.db_session.delete(db_member)
		self.bot.db_session.commit()
		return True
