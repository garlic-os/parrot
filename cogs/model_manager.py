from discord.ext.commands import Cog
from bot import Parrot
from utils.lru_cache import LRUCache
from utils.parrot_markov import ParrotMarkov

import os


class ModelManager(LRUCache[int, ParrotMarkov]):
    def __init__(self, bot: Parrot, cache_size: int):
        super().__init__(cache_size)
        self.bot = bot

    def __getitem__(self, user_id: int) -> ParrotMarkov:
        """
        Get a Markov model by user ID, from cache if it's cached or from their
          corpus if it's not.
        """
        # Retrieve from cache if possible.
        try:
            return super().__getitem__(user_id)
        except KeyError:
            pass

        # Otherwise, fetch their corpus and create a new Markov model.
        corpus = self.bot.corpora.get(user_id)
        model = ParrotMarkov(corpus)

        # Cache this Markov model for next time.
        super().__setitem__(user_id, model)
        return model

    def __contains__(self, element: object) -> bool:
        if isinstance(element, int):
            return super().__contains__(element) or self.bot.corpora.has(element)
        return False


class ModelManagerCog(Cog):
    def __init__(self, bot: Parrot):
        cache_size = int(os.environ.get("CHAIN_CACHE_SIZE", 5))
        bot.models = ModelManager(bot, cache_size)


def setup(bot: Parrot) -> None:
    bot.add_cog(ModelManagerCog(bot))
