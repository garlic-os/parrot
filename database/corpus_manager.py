from typing import List, Union, cast
from utils.types import CorpusManagerInterface, ParrotInterface
from discord import User, Member, Message
from exceptions import NoDataError, NotRegisteredError


class CorpusManager(CorpusManagerInterface):
    def __init__(self, bot: ParrotInterface):
        self.bot = bot

    def add(self, user: Union[User, Member], message: Message) -> None:
        """ Record a message to a user's corpus. """
        self.assert_registered(user)

        # TODO: Uncomment when model.update() is implemented
        # model = self.bot.get_model(user.id)

        # Also learn from text inside embeds, if the user is a bot.
        # If it's not from a bot, it's probably just YouTube descriptions and not worth learning from.
        if message.author.bot:
            for embed in message.embeds:
                desc = embed.description
                if isinstance(desc, str):
                    message.content += "\n" + desc

        # Thank you to Litleck for the idea to include attachment URLs.
        for attachment in message.attachments:
            message.content += " " + attachment.url

        # model.update(message.content)

        self.bot.redis.hset(
            name=f"corpus:{user.id}",
            key=str(message.id),
            value=message.content,
        )

    def get(self, user: Union[User, Member]) -> List[str]:
        """ Get a corpus from the source of truth by user ID. """
        self.assert_registered(user)
        corpus = cast(List[str], self.bot.redis.hvals(f"corpus:{user.id}"))
        if len(corpus) == 0:
            raise NoDataError(f"No data available for user {user}.")
        return corpus

    def delete(self, user: Union[User, Member]) -> None:
        """ Delete a corpus from the source of truth. """
        num_deleted = self.bot.redis.delete(f"corpus:{user.id}")
        if num_deleted == 0:
            raise NoDataError(f"No data available for user {user}.")

    def delete_message(self, user: Union[User, Member], message_id: int) -> None:
        """ Delete a message (or list of messages) from a corpus. """
        num_deleted = self.bot.redis.hdel(f"corpus:{user.id}", str(message_id))
        if num_deleted == 0:
            raise NoDataError(f"No data available for user {user}.")

    def has(self, user: object) -> bool:
        """ Check if a user's corpus is present on the source of truth. """
        return (
            (isinstance(user, User) or isinstance(user, Member)) and
            bool(self.bot.redis.exists(f"corpus:{user.id}"))
        )

    def assert_registered(self, user: Union[User, Member]) -> None:
        if not user.bot and user.id not in self.bot.registered_users:
            raise NotRegisteredError(f"User {user} is not registered. To register, read the privacy policy with `{self.bot.command_prefix}policy`, then register with `{self.bot.command_prefix}register`.")
