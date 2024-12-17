import random
from collections.abc import Awaitable, Callable

from discord import Member, User
from discord.errors import NotFound
from discord.ext import commands

import parrot.utils.regex as patterns
from parrot.config import settings
from parrot.utils.exceptions import UserNotFoundError


type Check = Callable[
	[commands.Context, str | None],
	Awaitable[User | Member | None]
]

class BaseUserlike(commands.Converter):
	def __init__(self):
		self._checks: list[Check] = []

	def _user_not_found(self, text: str) -> UserNotFoundError:
		return UserNotFoundError(f'User "{text}" does not exist.')

	async def convert(self, ctx: commands.Context, argument: str) -> User | Member:
		argument = argument.lower()

		for check in self._checks:
			result = await check(ctx, argument)
			if result is not None:
				return result

		# If this is not a guild, it must be a DM channel, and therefore the
		# only person you can imitate is yourself.
		if ctx.guild is None:
			raise self._user_not_found(argument)

		# Strip the mention down to an ID.
		try:
			user_id = int(patterns.snowflake.sub("", argument))
		except ValueError:
			raise self._user_not_found(argument)

		# Fetch the member by ID.
		try:
			return await ctx.guild.fetch_member(user_id)
		except NotFound:
			raise self._user_not_found(argument)


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
		""" Get the author of the last message send in the channel who isn't
		Parrot or the person who sent this command. """
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

	async def _someone(self, ctx, text):
		""" Choose a random registered user in this channel. """
		if text in ("someone", "somebody", "anyone", "anybody"):
			if not settings.enable_imitate_someone:
				raise UserNotFoundError(
					f'The "{settings.command_prefix}imitate someone" feature is disabled.'
				)
			if ctx.guild is None:
				return ctx.author
			# list of users who are both in this channel and registered
			registered_users_here = filter(
				lambda user: (
					user.id in ctx.bot.registered_users or
					(user.bot and user.id != ctx.bot.user.id)
				),
				ctx.guild.members
			)
			return random.choice(tuple(registered_users_here))
