from typing import Dict
from discord import User

import os
from discord.ext import commands
from utils.exceptions import NoDataError
from utils.size_capped_dict import SizeCappedDict
from utils.parrot_markov import ParrotMarkov


class ChainManager(Dict[User, ParrotMarkov]):
    def __init__(self, bot: commands.Bot, cache_size: int) -> None:
        self.bot = bot
        self._cache = SizeCappedDict(cache_size)

    def __getitem__(self, user: User) -> ParrotMarkov:
        """
        Get a Markov Chain by user ID, from cache if it's cached or from their
          corpus if it's not.
        """
        # Retrieve from cache if possible.
        chain = self._cache.get(user.id, None)
        if chain:
            return chain

        # Otherwise, fetch their corpus and create a new Markov chain.
        corpus = self.bot.corpora[user]
        chain = ParrotMarkov(corpus)

        # Cache this Markov chain for next time.
        self._cache[user.id] = chain
        return chain


    def __delitem__(self, user: User) -> None:
        # Redirect delete calls to the inner cache
        del self._cache[user.id]
    

    def has_key(self, user: User) -> bool:
        return user.id in self._cache or user in self.bot.corpora


class ChainManagerCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        cache_size = int(os.environ.get("CHAIN_CACHE_SIZE", 5))
        bot.chains = ChainManager(bot, cache_size)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(ChainManagerCog(bot))
