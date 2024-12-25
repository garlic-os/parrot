from parrot.core.pbwc import ParrotButWithoutCRUD
from parrot.db.crud import CRUD


class Parrot(ParrotButWithoutCRUD):
	def __init__(self):
		super().__init__()
		self.crud = CRUD(self)
