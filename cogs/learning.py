from typing import Union, List, cast
from discord import Message, ChannelType

import re
import os
from discord.ext import commands
from utils.disk_set import DiskSet
from utils import regex


class LearningCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        learning_path = os.environ.get(
            "DB_LEARNING_CHANNELS_PATH", "data/learning-channels.json"
        )
        speaking_path = os.environ.get(
            "DB_SPEAKING_CHANNELS_PATH", "data/speaking-channels.json"
        )

        bot.validate_message = self.validate_message
        bot.learn_from = self.learn_from
        bot.learning_channels = DiskSet(learning_path)
        bot.speaking_channels = DiskSet(speaking_path)

    def validate_message(self, message: Message) -> bool:
        """
        A message must pass all of these checks
          before Parrot can learn from it.
        """
        content = message.content
    
        return (
            # Text content not empty.
            # mypy giving some nonsense error that doesn't appear in runtime
            len(content) > 0 and  # type: ignore

            # Not a Parrot command.
            not content.startswith(self.bot.command_prefix) and

            # Only learn in text channels, not DMs.
            message.channel.type == ChannelType.text and

            # Lot of bots' commands start with non-alphanumeric characters, so
            #   if a message starts with one other than a known Markdown
            #   character or special Discord character, Parrot should just
            #   avoid it because it's probably a command.
            (
                content[0].isalnum() or
                re.match(regex.discord_string_start, content[0]) or
                re.match(regex.markdown, content[0])
            ) and

            # Don't learn from self.
            message.author.id != self.bot.user.id and

            # Don't learn from Webhooks.
            not message.webhook_id and

            # Parrot must be allowed to learn in this channel.
            message.channel.id in self.bot.learning_channels
        )


    def learn_from(self, messages: Union[Message, List[Message]]) -> int:
        """
        Add a Message or array of Messages to a user's corpus.
        Every Message in the array must be from the same user.
        """
        # Ensure that messages is a list.
        # If it's not, make it a list with one value.
        if type(messages) is not list:
            messages = [cast(Message, messages)]
        messages = cast(List[Message], messages)

        user = messages[0].author

        # Every message in the array must have the same author, because the
        #   Corpus Manager adds every message passed to it to the same user.
        for message in messages:
            if message.author != user:
                raise ValueError("Too many authors; every message in a list passed to learn_from() must have the same author.")

        # Only keep messages that pass all of validate_message()'s checks.
        messages = list(filter(self.validate_message, messages))

        # Add these messages to this user's corpus.
        if len(messages) > 0:
            self.bot.corpora.add(user, messages)

        # Return the number of messages that were added.
        return len(messages)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(LearningCog(bot))
