from typing import Dict, NamedTuple
from abc import ABCMeta, abstractmethod
from discord import Message, User
import aiohttp
from discord.ext.commands import AutoShardedBot
from redis import Redis
from database.redis_set import RedisSet
from utils.parrot_markov import ParrotMarkov


class ConfirmationBody(NamedTuple):
    author: User  # The forget command message's author
    corpus_owner: User  # User for whose the corpus to be forgotten

# Key: Message ID of a forget command
PendingConfirmations = Dict[int, ConfirmationBody]


class ModifiedAvatar(TypedDict):
    original_avatar_url: str
    modified_avatar_url: str
    source_message_id: int


class AvatarManagerInterface(metaclass=ABCMeta):
    """ TODO """
    pass


class CorpusManagerInterface(metaclass=ABCMeta):
    """ TODO """
    pass

class ParrotInterface(AutoShardedBot, metaclass=ABCMeta):
    redis: Redis
    http_session: aiohttp.ClientSession
    registered_users: RedisSet
    learning_channels: RedisSet
    speaking_channels: RedisSet
    corpora: CorpusManagerInterface
    avatars: AvatarManagerInterface

    @classmethod
    def __subclasshook__(cls, subclass):
        return (
            hasattr(subclass, "get_model") and
            callable(subclass.get_model) and
            hasattr(subclass, "validate_message") and
            callable(subclass.validate_message) and
            hasattr(subclass, "learn_from") and
            callable(subclass.learn_from) or
            NotImplemented
        )

    @abstractmethod
    def get_model(self, user_id: int) -> ParrotMarkov:
        """ Get a Markov model by user ID. """
        raise NotImplementedError

    @abstractmethod
    def validate_message(self, message: Message) -> bool:
        """
        A message must pass all of these checks before Parrot can learn from it.
        """
        raise NotImplementedError

    @abstractmethod
    def learn_from(self, message: Message) -> int:
        """ Add a message to a user's corpus. """
        raise NotImplementedError
