from parrot.config import settings
from parrot.core.semiparrot.managerless import SemiparrotManagerless
from parrot.db.crud import CRUD
from parrot.db.manager.antiavatar import AntiavatarManager
from parrot.db.manager.markov_model import MarkovModelManager
from parrot.db.manager.webhook import WebhookManager


class Parrot(SemiparrotManagerless):
	"""
	Parrot class init stage 3/3
	CRUD: initialized
	Managers: initialized

	Establishes anything the Parrot class needs to do that requires CRUD and
	a data manager.
	"""
	crud: CRUD
	markov_models: MarkovModelManager
	antiavatars: AntiavatarManager
	webhooks: WebhookManager

	def __init__(self):
		super().__init__()
		self.crud = CRUD(self)
		self.markov_models = MarkovModelManager(
			self.crud, max_mem_size=settings.markov_cache_size_bytes
		)
		self.webhooks = WebhookManager(self)

	async def setup_hook(self) -> None:
		await super().setup_hook()
		self.antiavatars = await AntiavatarManager.new(self)
