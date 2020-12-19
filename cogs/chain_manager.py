import os
from discord.ext import commands
from utils.exceptions import NoDataError
from utils.lru_cache import LRUCache
from utils.parrot_markov import ParrotMarkov


class ChainManager(LRUCache[int, ParrotMarkov]):
    def __init__(self, bot: commands.Bot, cache_size: int) -> None:
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

        # Otherwise, fetch their corpus and create a new Markov chain.
        corpus = self.bot.corpora[user_id]
        chain = ParrotMarkov(corpus)

        # Cache this Markov chain for next time.
        super().__setitem__(user_id, chain)
        return chain

    def __contains__(self, element: object) -> bool:
        if type(element) is int:
            return super().__contains__(element) or element in self.bot.corpora
        return False


class ChainManagerCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        cache_size = int(os.environ.get("CHAIN_CACHE_SIZE", 5))
        bot.chains = ChainManager(bot, cache_size)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(ChainManagerCog(bot))
