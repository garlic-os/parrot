from typing import Awaitable, Callable, List, Optional, Union
from discord.ext import commands
from discord import Member, User

from discord.errors import NotFound
from utils.exceptions import UserNotFoundError

import re
import random
import config


class BaseUserlike(commands.Converter):
    def __init__(self):
        Check = Callable[
            [commands.Context, Optional[str]],
            Awaitable[Optional[Union[User, Member]]]
        ]
        self._checks: List[Check] = []

    def _user_not_found(text: str) -> UserNotFoundError:
        return UserNotFoundError(f'User "{text}" does not exist.')

    async def convert(self, ctx: commands.Context, text: str=None) -> Union[User, Member]:
        if text is None:
            raise self._user_not_found(text)

        text = text.lower()

        for check in self._checks:
            result = await check(ctx, text)
            if result is not None:
                return result

        # If this is not a guild, it must be a DM channel, and therefore the
        # only person you can imitate is yourself.
        if ctx.guild is None:
            raise self._user_not_found(text)

        # Strip the mention down to an ID.
        try:
            user_id = int(re.sub("[^0-9]", "", text))
        except ValueError:
            raise self._user_not_found(text)

        # Fetch the member by ID.
        try:
            return await ctx.guild.fetch_member(user_id)
        except NotFound:
            raise self._user_not_found(text)

        raise self._user_not_found(text)


class Userlike(BaseUserlike):
    """
    A string that can resolve to a User.
    Works with:
        - Mentions, like <@394750023975409309> and <@!394750023975409309>
        - User IDs, like 394750023975409309
        - The string "me" or "myself", which resolves to the context's author
        - The string "you", "yourself", or "previous" which resolves to the last
            person who spoke in the channel
    """
    def __init__(self):
        super().__init__()
        self._checks.append(self._me)

    async def _me(self, ctx, text):
        if text in ("me", "myself"):
            return ctx.author


class FuzzyUserlike(Userlike):
    def __init__(self):
        super().__init__()
        self._checks.append(self._you)
        self._checks.append(self._someone)

    async def _you(self, ctx, text):
        # Get the author of the last message send in the channel who isn't
        # Parrot or the person who sent this command.
        if text in ("you", "yourself", "previous"):
            async for message in ctx.channel.history(
                before=ctx.message,
                limit=50
            ):
                if (
                    message.author not in (ctx.bot.user, ctx.author) and
                    message.webhook_id is None
                ):
                    # Authors of messages from a history iterator are always
                    # users, not members, so we have to fetch the member
                    # separately.
                    if ctx.guild is not None:
                        return await ctx.guild.fetch_member(message.author.id)
                    return message.author

    # Choose a random registered user in this channel.
    async def _someone(self, ctx, text):
        if text in ("someone", "somebody", "anyone", "anybody"):
            if not config.ENABLE_IMITATE_SOMEONE:
                raise UserNotFoundError('The "|imitate someone" feature is disabled.')
            if ctx.guild is None:
                return ctx.author
            # List of users who are both in this channel and registered
            registered_users_here = filter(
                lambda user: (
                    user.id in ctx.bot.registered_users or
                    (user.bot and user.id != ctx.bot.user.id)
                ),
                ctx.guild.members
            )
            return random.choice(tuple(registered_users_here))
