import os
from discord.ext import commands
from utils.lru_cache import LRUCache
from utils.parrot_markov import ParrotMarkov


class ModelManager(LRUCache[int, ParrotMarkov]):
    def __init__(self, bot: commands.Bot, cache_size: int):
        super().__init__(cache_size)
        self.bot = bot

    def __getitem__(self, user_id: int) -> ParrotMarkov:
        """
        Get a Markov Chain by user ID, from cache if it's cached or from their
          corpus if it's not.
        """
        # Retrieve from cache if possible.
        try:
            return super().__getitem__(user_id)
        except KeyError:
            pass

        # Otherwise, fetch their corpus and create a new Markov Chain.
        corpus = self.bot.corpora.get(user_id)
        model = ParrotMarkov(corpus)

        # Cache this Markov Chain for next time.
        super().__setitem__(user_id, model)
        return model

    def __contains__(self, element: object) -> bool:
        if isinstance(element, int):
            return super().__contains__(element) or self.bot.corpora.has(element)
        return False


class ModelManagerCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        cache_size = int(os.environ.get("CHAIN_CACHE_SIZE", 5))
        bot.models = ModelManager(bot, cache_size)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(ModelManagerCog(bot))
