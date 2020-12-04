from discord import User, Message
from typing import Dict, List, Union
from utils.types import Corpus

import os
import ujson as json  # ujson is faster
from discord.ext import commands


class CorpusManager(Dict[User, Corpus]):
    def __init__(self, bot: commands.Bot, corpora_dir: str) -> None:
        self.bot = bot
        self.corpora_dir = corpora_dir
        os.makedirs(corpora_dir, exist_ok=True)


    def _file_path_no_check(self, user: User) -> str:
        return os.path.join(self.corpora_dir, str(user.id) + ".json")


    def file_path(self, user: User) -> str:
        self.bot.registration.verify(user)
        if self.has_key(user):
            return self._file_path_no_check(user)
        raise FileNotFoundError(user.id)


    def add(self, user: User, messages: Union[Message, List[Message]]) -> None:
        """
        Record a message to a user's corpus.
        Also, if this user's Markov Chain is cached, update it with the new
          information, too.
        """
        self.bot.registration.verify(user)

        if type(messages) is not list:
            messages = [messages]  # type: ignore -- It's definitely a List[Message] now

        # TODO: Uncomment when chain.update() implemented
        # chain = self.bot.chains.cache.get(user.id, None)
        corpus: Corpus = self.get(user, {})

        for message in messages:
            # Help, how do I make mypy stop saying this
            # Incompatible types in assignment (expression has type
            #   "Dict[str, Any]", target has type "CorpusMessage")
            corpus[message.id] = {
                "content": message.content,
                "timestamp": str(message.created_at),
            }
            # if chain:
            #     chain.update(message.content)

        self[user] = corpus


    def __getitem__(self, user: User) -> Corpus:
        """ Get a corpus by user ID. """
        self.bot.registration.verify(user)
        corpus_path = self._file_path_no_check(user)
        try:
            with open(corpus_path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            raise KeyError(user.id)


    def __setitem__(self, user: User, corpus: Corpus) -> None:
        """ Create or overwrite a corpus file. """
        self.bot.registration.verify(user)
        corpus_path = self._file_path_no_check(user)
        with open(corpus_path, "w") as f:
            json.dump(corpus, f)


    def __delitem__(self, user: User) -> None:
        """ Delete a user's corpus. """
        corpus_path = self._file_path_no_check(user)
        try:
            os.remove(corpus_path)
        except FileNotFoundError:
            raise KeyError(user.id)


    def has_key(self, user: User) -> bool:
        """ Check if a user's corpus is present on disk. """
        corpus_path = self._file_path_no_check(user)
        return os.path.exists(corpus_path)


class CorpusManagerCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        corpus_dir = os.environ.get("DB_CORPUS_DIR", "./databases/corpora/")
        bot.corpora = CorpusManager(bot, corpus_dir)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(CorpusManagerCog(bot))
