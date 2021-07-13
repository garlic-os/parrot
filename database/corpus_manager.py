from typing import List, Union, cast
from discord import User, Member, Message
from discord.ext.commands import Cog
from bot import Parrot
from exceptions import NoDataError


class CorpusManager():
    def __init__(self, bot: Parrot):
        self.bot = bot
        self.r = bot.redis

    def add(self, user: Union[User, Member], messages: Union[Message, List[Message]]) -> int:
        """
        Record a message to a user's corpus.
        Also, if this user's Markov Chain is cached, update it with the new
            information, too.
        """
        self.bot.assert_registered(user)

        if not isinstance(messages, list):
            messages = [messages]

        # TODO: Uncomment when model.update() is implemented
        # model = self.bot.get_model(user.id)

        subcorpus = {}
        for message in messages:
            # Thank you to Litleck for the idea to include attachment URLs.
            for embed in message.embeds:
                desc = embed.description
                if isinstance(desc, str):
                    message.content += " " + desc
            for attachment in message.attachments:
                message.content += " " + attachment.url
            subcorpus[str(message.id)] = message.content
            # model.update(message.content)

        return self.r.hset(  # type: ignore
            name=str(user.id),
            mapping=subcorpus,    # type: ignore
        )
        # mypy thinks `key` and `value` arguments are required, but that's not
        # true when `mapping` is provided.

    def get(self, user: Union[User, Member]) -> List[str]:
        """ Get a corpus from the source of truth by user ID. """
        self.bot.assert_registered(user)
        corpus = cast(List[str], self.r.hvals(str(user.id)))
        if len(corpus) == 0:
            raise NoDataError(f"No data available for user {user}.")
        return corpus

    def delete(self, user: Union[User, Member]) -> None:
        """ Delete a corpus from the source of truth. """
        num_deleted = self.r.delete(str(user.id))
        if num_deleted == 0:
            raise NoDataError(f"No data available for user {user}.")

    def delete_message(self, user: Union[User, Member], message_id: int) -> None:
        """ Delete a message (or list of messages) from a corpus. """
        num_deleted = self.r.hdel(str(user.id), str(message_id))
        if num_deleted == 0:
            raise NoDataError(f"No data available for user {user}.")

    def has(self, user: object) -> bool:
        """ Check if a user's corpus is present on the source of truth. """
        return (
            (isinstance(user, User) or isinstance(user, Member)) and
            bool(self.r.exists(str(user.id)))
        )


class CorpusManagerCog(Cog):
    def __init__(self, bot: Parrot):
        bot.corpora = CorpusManager(bot)


def setup(bot: Parrot) -> None:
    bot.add_cog(CorpusManagerCog(bot))
