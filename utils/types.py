from typing import Dict, List, NamedTuple
from abc import ABCMeta, abstractmethod
from discord import Message, User
from discord.ext.commands import AutoShardedBot
from utils.parrot_markov import ParrotMarkov
import aiohttp


class ConfirmationBody(NamedTuple):
    author: User  # The forget command message's author
    corpus_owner: User  # User for whose the corpus to be forgotten

# Key: Message ID of a forget command
PendingConfirmations = Dict[int, ConfirmationBody]


class AvatarManagerInterface(metaclass=ABCMeta):
    """ TODO """
    pass


class CorpusManagerInterface(metaclass=ABCMeta):
    """ TODO """
    pass

# ...is making an interface really this verbose in Python?
class ParrotInterface(AutoShardedBot, metaclass=ABCMeta):
    db: Cursor
    http_session: aiohttp.ClientSession
    admin_role_ids: List[int]
    registered_users: Set
    learning_channels: Set
    speaking_channels: Set
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
            hasattr(subclass, "update_learning_channels") and
            callable(subclass.update_learning_channels) or
            hasattr(subclass, "update_speaking_channels") and
            callable(subclass.update_speaking_channels) or
            hasattr(subclass, "update_registered_users") and
            callable(subclass.update_registered_users) or
            hasattr(subclass, "load_folder") and
            callable(subclass.load_folder) or
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

    @abstractmethod
    def update_learning_channels(self) -> None:
        """ Fetch and cache the set of channels that Parrot can learn from. """
        raise NotImplementedError

    @abstractmethod
    def update_speaking_channels(self) -> None:
        """ Fetch and cache the set of channels that Parrot can speak in. """
        raise NotImplementedError

    @abstractmethod
    def update_registered_users(self) -> None:
        """ Fetch and cache the set of users who are registered. """
        raise NotImplementedError

    def load_folder(self, folder_name: str) -> None:
        raise NotImplementedError
