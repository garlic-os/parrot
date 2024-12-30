from typing import TYPE_CHECKING, Any

import sqlmodel as sm

import parrot.db.models as p
from parrot.core.types import AnyUser

from .types import SubCRUD


if TYPE_CHECKING:
	from parrot.bot import Parrot


class CRUDUser(SubCRUD):
	"""Methods that pertain to the Member table but are Guild-agnostic"""

	def __init__(self, bot: "Parrot"):
		super().__init__(bot)

	def get_raw(self, user: AnyUser) -> dict[str, Any] | None:
		statement = sm.select(p.Member).where(p.Member.id == user.id)
		db_member = self.bot.db_session.exec(statement).first()
		if db_member is None:
			return None
		# TODO: this dumps the relationships too, right?
		return db_member.model_dump(mode="json")

	def exists(self, user: AnyUser) -> bool:
		"""Search Parrot's database for any trace of this user."""
		statement = sm.select(p.Member.id).where(p.Member.id == user.id)
		return self.bot.db_session.exec(statement).first() is not None

	def delete_all_data(self, user: AnyUser) -> bool:
		"""Delete ALL the data associated with a Member.
		You better be sure calling this method."""
		statement = sm.select(p.Member).where(p.Member.id == user.id)
		db_member = self.bot.db_session.exec(statement).first()
		if db_member is None:
			return False
		self.bot.db_session.delete(db_member)
		self.bot.db_session.commit()
		return True
