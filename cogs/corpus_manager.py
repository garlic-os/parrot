from discord import User, Member, Message
from typing import Any, cast, Dict, List, Iterator, Optional, Union
from utils.types import Corpus

import os
import ujson as json  # ujson is faster
from discord.ext import commands
from utils.exceptions import NoDataError


class CorpusManager(Dict[User, Corpus]):
    def __init__(self, bot: commands.Bot, corpora_dir: str) -> None:
        self.bot = bot
        self.corpora_dir = corpora_dir

    def _file_path_no_check(self, user: User) -> str:
        return os.path.join(self.corpora_dir, str(user.id) + ".json")

    def file_path(self, user: User) -> str:
        self.bot.registration.verify(user)
        corpus_path = self._file_path_no_check(user)
        if os.path.exists(corpus_path):
            return corpus_path
        raise FileNotFoundError(user.id)

    def add(self, user: User, messages: Union[Message, List[Message]]) -> int:
        """
        Record a message to a user's corpus.
        Also, if this user's Markov Chain is cached, update it with the new
            information, too.
        """
        self.bot.registration.verify(user)

        if type(messages) is not list:
            # No, mypy, it's definitely a List[Message] now
            messages = [messages]  # type: ignore

        # TODO: Uncomment when chain.update() implemented
        # chain = self.bot.chains.cache.get(user.id, None)
        corpus: Corpus = self.get(user, {})

        before_length = len(corpus)

        # messages is definitely iterable
        for message in messages:  # type: ignore
            corpus[str(message.id)] = {
                "content": message.content,
                "timestamp": str(message.created_at),
            }
            # if chain:
            #     chain.update(message.content)

        self[user] = corpus
        num_messages_added = len(corpus) - before_length
        return num_messages_added

    def __getitem__(self, user: User) -> Corpus:
        """ Get a corpus by user ID. """
        self.bot.registration.verify(user)
        corpus_path = self._file_path_no_check(user)
        try:
            with open(corpus_path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            raise NoDataError(f"No data available for user {user.name}#{user.discriminator}.")

    def get(self, user: User, default: Optional[Corpus]=None) -> Any:
        """ .get() wasn't working until I explicitly defined it ¯\_(ツ)_/¯ """
        try:
            return self[user]
        except NoDataError:
            return default

    def __setitem__(self, user: User, corpus: Corpus) -> None:
        """ Create or overwrite a corpus file. """
        self.bot.registration.verify(user)
        corpus_path = self._file_path_no_check(user)
        with open(corpus_path, "w") as f:
            json.dump(corpus, f)

    def __delitem__(self, user: User) -> None:
        """ Delete a corpus file. """
        corpus_path = self._file_path_no_check(user)
        try:
            os.remove(corpus_path)
        except FileNotFoundError:
            raise NoDataError(f"No data available for user {user.name}#{user.discriminator}.")

    def __contains__(self, element: object) -> bool:
        """ Check if a user's corpus is present on disk. """
        if type(element) is User or type(element) is Member:
            element = cast(User, element)
            corpus_path = self._file_path_no_check(element)
            return os.path.exists(corpus_path)
        return False

    def __iter__(self) -> Iterator[User]:
        for filename in os.listdir(self.corpora_dir):
            user_id, ext = os.path.splitext(filename)
            if ext == ".json":
                yield self.bot.get_user(user_id)

    def _is_json(self, filename: str) -> bool:
        return filename.endswith(".json")

    def __len__(self) -> int:
        return len(list(filter(self._is_json, os.listdir(self.corpora_dir))))


class CorpusManagerCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        corpus_dir = os.environ.get("DB_CORPUS_DIR", "data/corpora/")
        bot.corpora = CorpusManager(bot, corpus_dir)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(CorpusManagerCog(bot))
