from typing import List, Union
from discord import ChannelType, Message
from bot import Parrot
from exceptions import NotRegisteredError

import os
import logging
from discord.ext import commands
from utils import regex


class MessageEventHandler(commands.Cog):
    def __init__(self, bot: Parrot):
        self.bot = bot


    @commands.Cog.listener()
    async def on_message(self, message: Message) -> None:
        """
        Handle receiving messages.
        Monitors messages of registered users.
        """
        if message.author.id == self.bot.user.id:
            return

        # I am a mature person making a competent Discord bot.
        if (
            message.content == "ayy"
            and
            os.environ.get("AYY_LMAO", None) in ("true", "True", "1")
        ):
            await message.channel.send("lmao")

        # Ignore NotRegisteredError errors; Parrot shouldn't learn from
        #   non-registered users, anyway.
        try:
            learned_count = self.learn_from(message)
            tag = f"{message.author.name}#{message.author.discriminator}"

            # Log results.
            if learned_count == 1:
                logging.info(f"Collected a message (ID: {message.id}) from user {tag} (ID: {message.author.id})")
            elif learned_count != 0:
                logging.info(f"Collected {learned_count} messages from {tag} (ID: {message.author.id})")
        except NotRegisteredError:
            pass

        # Imitate again when someone replies to an imitate message.
        # if message.reference is not None:
        #     src_message = await message.channel.fetch_message(
        #         message.reference.message_id
        #     )
        #     if (src_message is not None and
        #         src_message.webhook_id is not None and
        #         src_message.channel.id in self.bot.speaking_channels):
        #         try:
        #             # HACK: Get the ID of the user Parrot imitated in this
        #             # message through the message's AVATAR URL.
        #             # Really relying on implementation quirks here, but I don't
        #             # want to put in the effort to, like, log which messages
        #             # imitate who or something like that to be able to do this
        #             # properly.
        #             # If Discord ever changes the structure of their avatar URLs
        #             # or if I change Parrot to use different avatars, this will
        #             # probably break. But I guess now we'll just cross that
        #             # bridge when it comes.
        #             avatar_url = str(src_message.author.avatar_url)
        #             user_id = avatar_url.split("/")[4]
        #             message.content = user_id
        #             ctx = await self.bot.get_context(message)
        #             imitate_command = self.bot.get_command("imitate")
        #             await imitate_command.prepare(ctx)
        #             await imitate_command(ctx, user_id)
        #         except Exception as e:
        #             # Don't try to make amends if this feature fails. It isn't
        #             # that important.
        #             pass


    def validate_message(self, message: Message) -> bool:
        """
        A message must pass all of these checks
            before Parrot can learn from it.
        """
        content = message.content

        return (
            # Text content not empty.
            # mypy giving some nonsense error that doesn't occur in runtime
            len(content) > 0 and  # type: ignore

            # Not a Parrot command.
            not content.startswith(self.bot.command_prefix) and

            # Only learn in text channels, not DMs.
            message.channel.type == ChannelType.text and

            # Most bots' commands start with non-alphanumeric characters, so if
            # a message starts with one other than a known Markdown character or
            # special Discord character, Parrot should just avoid it because
            # it's probably a command.
            (
                content[0].isalnum() or
                regex.discord_string_start.match(content[0]) or
                regex.markdown.match(content[0])
            ) and

            # Don't learn from self.
            message.author.id != self.bot.user.id and

            # Don't learn from Webhooks.
            not message.webhook_id and

            # Parrot must be allowed to learn in this channel.
            message.channel.id in self.bot.learning_channels and

            # People will often say "v" or "z" on accident while spamming;
            # they don't like when Parrot learns from those mistakes.
            content not in ("v", "z")
        )


    def learn_from(self, messages: Union[Message, List[Message]]) -> int:
        """
        Add a Message or array of Messages to a user's corpus.
        Every Message in the array must be from the same user.
        """
        # Ensure that messages is a list.
        # If it's not, make it a list with one value.
        if not isinstance(messages, list):
            messages = [messages]

        user = messages[0].author

        # Every message in the array must have the same author, because the
        # Corpus Manager adds every message passed to it to the same user.
        for message in messages:
            if message.author != user:
                raise ValueError("Too many authors; every message in a list passed to learn_from() must have the same author.")

        # Only keep messages that pass all of validate_message()'s checks.
        messages = list(filter(self.validate_message, messages))

        # Add these messages to this user's corpus and return the number of
        # messages that were added.
        if len(messages) > 0:
            return self.bot.corpora.add(user, messages)
        return 0




def setup(bot: Parrot) -> None:
    bot.add_cog(MessageEventHandler(bot))
