from parrot.core.semiparrot.crudless import SemiparrotCrudless


class SubCRUD:
	bot: SemiparrotCrudless

	def __init__(self, bot: SemiparrotCrudless):
		self.bot = bot
