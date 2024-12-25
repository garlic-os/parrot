import discord

import parrot.db.models as p
import parrot.utils.regex as patterns
from parrot.config import settings
from parrot.core.pbwc import ParrotButWithoutCRUD
from parrot.core.types import Snowflake
from parrot.utils import cast_not_none

from . import _channel, _user
from .types import SubCRUD


class CRUDMessage(SubCRUD):
	def __init__(
		self,
		bot: ParrotButWithoutCRUD,
		crud_channel: _channel.CRUDChannel,
		crud_user: _user.CRUDUser,
	):
		super().__init__(bot)
		self.crud_channel = crud_channel
		self.crud_user = crud_user

	@staticmethod
	def _extract_text(message: discord.Message) -> str:
		for embed in message.embeds:
			if embed.description is not None:
				message.content += "\n" + embed.description
		for attachment in message.attachments:
			message.content += " " + attachment.url
		return message.content

	def validate_message(self, message: discord.Message) -> bool:
		"""
		A message must pass all of these checks before Parrot can learn from it.
		"""
		return (
			# Text content not empty.
			len(message.content) > 0
			and
			# Not a Parrot command.
			not message.content.startswith(settings.command_prefix)
			and
			# Only learn in text channels, not DMs (or anywhere else).
			isinstance(message.channel, discord.TextChannel)
			and
			# Most bots' commands start with non-alphanumeric characters, so if
			# a message starts with one other than a known Markdown character or
			# special Discord character, Parrot should just avoid it because
			# it's probably a command.
			(
				message.content[0].isalnum()
				or bool(patterns.discord_string_start.match(message.content[0]))
				or bool(patterns.markdown.match(message.content[0]))
			)
			and
			# Don't learn from self.
			message.author.id != cast_not_none(self.bot.user).id
			and
			# Don't learn from Webhooks.
			message.webhook_id is None
			and
			# Parrot must be allowed to learn in this channel.
			self.crud_channel.has_permission(message.channel, "can_learn_here")
			and
			# People will often say "v" or "z" on accident while spamming,
			# and it doesn't really make for good learning material.
			message.content not in ("v", "z")
		)

	def record(self, messages: discord.Message | list[discord.Message]) -> None:
		"""
		Add a Message or list of Messages to a user's corpus.
		Every Message in the list must be from the same user.
		"""
		# Ensure that messages is a list.
		# If it's not, just make it a list with one value.
		if not isinstance(messages, list):
			messages = [messages]

		user = messages[0].author
		guild = messages[0].guild
		if guild is None or self.crud_user.is_registered(user, guild):
			return

		# Every message in the list must have the same author, because the
		# Corpus Manager adds every message passed to it to the same user.
		for message in messages:
			if message.author != user:
				raise ValueError(
					"Too many authors; every message passed in one call to"
					"record() must have the same author."
				)

		# Filter out any messages that don't pass all of validate_message()'s
		# checks and convert them to the database's format.
		db_messages = (
			p.Message(
				id=m.id,
				user_id=user.id,
				guild_id=guild.id,
				timestamp=m.created_at,
				content=CRUDMessage._extract_text(m),
			)
			for m in messages
			if self.validate_message(m)
		)

		# Add these messages to this user's corpus and return the number of
		# messages that were added.
		self.bot.db_session.add_all(db_messages)
		self.bot.db_session.commit()

		# for message in messages:
		# 	self.bot.db_session.refresh(message)
		# if len(messages) > 0:
		# 	return self.corpora.add(user, messages)
		# return 0

	def delete(self, message_id: Snowflake) -> None:
		"""Delete a message from the database."""
		db_message = self.bot.db_session.get(p.Message, message_id)
		self.bot.db_session.delete(db_message)
		self.bot.db_session.commit()

	def edit(self, message_id: Snowflake, new_content: str) -> bool:
		"""Edit the text content of a message in the database.
		:returns: Success (will fail if message does not exist in database)
		"""
		db_message = self.bot.db_session.get(p.Message, message_id)
		if db_message is None:
			return False
		db_message.content = new_content
		self.bot.db_session.add(db_message)
		self.bot.db_session.commit()
		return True
