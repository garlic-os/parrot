from parrot.core.pbwc import ParrotButWithoutCRUD


class SubCRUD:
	bot: ParrotButWithoutCRUD

	def __init__(self, bot: ParrotButWithoutCRUD):
		self.bot = bot
