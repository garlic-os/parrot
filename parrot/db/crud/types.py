from typing import TYPE_CHECKING


if TYPE_CHECKING:
	from parrot.bot import Parrot

class SubCRUD:
	def __init__(self, bot: "Parrot"):
		self.bot = bot
