from typing import List, Union, cast
from utils.types import CorpusManagerInterface, ParrotInterface
from discord import User, Member, Message
from redis import Redis
from database.redis_set import RedisSet
from exceptions import NoDataError, NotRegisteredError


class CorpusManager(CorpusManagerInterface):
    def __init__(self, bot: ParrotInterface):
        self.bot = bot

    def add(self, user: Union[User, Member], messages: Union[Message, List[Message]]) -> int:
        """
        Record a message to a user's corpus.
        Also, if this user's Markov Chain is cached, update it with the new
            information, too.
        """
        self.assert_registered(user)

        if not isinstance(messages, list):
            messages = [messages]

        # TODO: Uncomment when model.update() is implemented
        # model = self.bot.get_model(user.id)

        # Also learn from text inside embeds, if the user is a bot.
        # If it's not from a bot, it's probably just YouTube descriptions and not worth learning from.
        if message.author.bot:
            for embed in message.embeds:
                desc = embed.description
                if isinstance(desc, str):
                    message.content += "\n" + desc

        return self.redis.hset(  # type: ignore
            name=f"corpus:{user.id}",
            mapping=subcorpus,    # type: ignore
        )
        # mypy thinks `key` and `value` arguments are required, but that's not
        # true when `mapping` is provided.

    def get(self, user: Union[User, Member]) -> List[str]:
        """ Get a corpus from the source of truth by user ID. """
        self.assert_registered(user)
        corpus = cast(List[str], self.redis.hvals(f"corpus:{user.id}"))
        if len(corpus) == 0:
            raise NoDataError(f"No data available for user {user}.")
        return corpus

    def delete(self, user: Union[User, Member]) -> None:
        """ Delete a corpus from the source of truth. """
        num_deleted = self.redis.delete(f"corpus:{user.id}")
        if num_deleted == 0:
            raise NoDataError(f"No data available for user {user}.")

    def delete_message(self, user: Union[User, Member], message_id: int) -> None:
        """ Delete a message (or list of messages) from a corpus. """
        num_deleted = self.redis.hdel(f"corpus:{user.id}", str(message_id))
        if num_deleted == 0:
            raise NoDataError(f"No data available for user {user}.")

    def has(self, user: object) -> bool:
        """ Check if a user's corpus is present on the source of truth. """
        return (
            (isinstance(user, (User, Member)) and
            bool(self.redis.exists(f"corpus:{user.id}")))
        )

    def assert_registered(self, user: Union[User, Member]) -> None:
        if not user.bot and user.id not in self.registered_users:
            raise NotRegisteredError(f"User {user} is not registered. To register, read the privacy policy with `{self.command_prefix}policy`, then register with `{self.command_prefix}register`.")
