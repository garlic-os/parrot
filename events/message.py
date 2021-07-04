from discord import Message
from discord.ext.commands import CommandError
from utils.exceptions import NotRegisteredError

import os
from discord.ext import commands


class MessageEventHandler(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message: Message) -> None:
        """
        Handle receiving messages.
        Monitors messages of registered users.
        """
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
            learned_count = self.bot.learn_from(message)
            tag = f"{message.author.name}#{message.author.discriminator}"

            # Log results.
            if learned_count == 1:
                print(f"Collected a message from {tag}")
            elif learned_count != 0:
                print(f"Collected {learned_count} messages from {tag}")
        except NotRegisteredError:
            pass

        # Imitate again when someone replies to an imitate message.
        # I really wish Python had optional chaining right now.
        if (message.reference is not None and
            message.reference.cached_message is not None and
            message.reference.cached_message.webhook_id in self.bot.webhook_ids):
            ctx = self.bot.get_context(message)
            imitate_command = self.bot.get_command("imitate")
            try:
                await imitate_command.prepare(ctx)
            except CommandError as error:
                await imitate_command.dispatch_error(ctx, error)
            else:
                # HACK: Get the ID of the user Parrot imitated in this message
                # through the message's AVATAR URL.
                # Really relying on implementation quirks here, but I don't want
                # to put in the effort to, like, log which messages imitate who
                # or something like that to be able to do this properly.
                # If Discord ever changes the structure of their avatar URLs or
                # if I change Parrot to use different avatars, this will
                # probably break. But I guess now we'll just cross that bridge
                # when it comes.
                avatar_url = str(message.reference.cached_message.author.avatar_url)
                user_id = avatar_url.split("/")[2]
                await imitate_command(ctx, user_id)



def setup(bot: commands.Bot) -> None:
    bot.add_cog(MessageEventHandler(bot))
