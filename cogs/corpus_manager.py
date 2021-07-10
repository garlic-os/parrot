# Types
from discord import User, Member, Message
from typing import List, Iterator, Union
from utils.types import Corpus

# Errors
from redis.exceptions import ResponseError
from exceptions import NoDataError

from discord.ext import commands
import ujson as json  # ujson is faster



class CorpusManager():
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.r = bot.redis

    def add(self, user: Union[User, Member], messages: Union[Message, List[Message]]) -> int:
        """
        Record a message to a user's corpus.
        Also, if this user's Markov Chain is cached, update it with the new
            information, too.
        """
        self.bot.registration.verify(user)

        if not isinstance(messages, list):
            messages = [messages]

        # TODO: Uncomment when model.update() is implemented
        # model = self.bot.models.get(user.id, None)

        before_length = self.r.execute_command("JSON.OBJLEN", str(user.id))

        for message in messages:
            # Thank you to Litleck for the idea to include attachment URLs.
            content = message.content
            for embed in message.embeds:
                desc = embed.description
                if isinstance(desc, str):
                    content += " " + desc
            for attachment in message.attachments:
                content += " " + attachment.url

            self.r.execute_command(
                "JSON.SET",
                "corpora",
                '["' + str(user.id) + '"]',
                '["' + str(message.id) + '"]',
                json.dumps({
                    "content": content,
                    "timestamp": message.created_at.timestamp(),
                })
            )
            # if model:
            #     model.update(message.content)

        # Number of messages added
        return self.r.execute_command("JSON.OBJLEN", str(user.id)) - before_length

    def get(self, user: Union[User, Member]) -> Corpus:
        """ Get a corpus from the source of truth by user ID. """
        self.bot.registration.verify(user)
        try:
            response = self.r.execute_command(
                "JSON.GET",
                "corpora",
                '["' + str(user.id) + '"]',
            )
            return json.loads(response)
        except ResponseError:
            raise NoDataError(f"No data available for user {user}.")

    def remove(self, user: Union[User, Member]) -> None:
        """ Delete a corpus from the source of truth. """
        num_deleted = self.r.execute_command(
            "JSON.FORGET",
            "corpora",
            '["' + str(user.id) + '"]',
        )
        if num_deleted == 0:
            raise NoDataError(f"No data available for user {user}.")

    def has(self, user: object) -> bool:
        """ Check if a user's corpus is present on the source of truth. """
        return (
            (isinstance(user, User) or isinstance(user, Member)) and
            self.r.execute_command(
                "JSON.TYPE",
                "corpora",
                '["' + str(user.id) + '"]',
            ) is not None
        )

    def keys(self, *args) -> Iterator[int]:
        for user_id in self.r.execute_command("JSON.OBJKEYS", "corpora", *args):
            yield user_id.decode()

    def size(self, *args) -> int:
        return self.r.execute_command("JSON.OBJLEN", "corpora", *args)


class CorpusManagerCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        bot.corpora = CorpusManager(bot)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(CorpusManagerCog(bot))
