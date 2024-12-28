from parrot.core.semiparrot.crudless import SemiparrotCrudless
from parrot.db.crud import CRUD


class SemiparrotManagerless(SemiparrotCrudless):
	"""
	Parrot class init stage 2/3
	CRUD: initialized
	Managers: uninitialized

	Establishes anything the Parrot class needs to do that requires CRUD but
	doesn't require any data manager.
	This stage exists so managers can interface with a version of Parrot that
	doesn't already have them, preventing a circular import.
	"""
	crud: CRUD

	def __init__(self):
		super().__init__()
		self.crud = CRUD(self)
