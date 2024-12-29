import logging
from collections.abc import Iterable
from typing import cast

import discord
import markovify

from parrot.config import settings
from parrot.core.types import Snowflake
from parrot.db.crud import CRUD
from parrot.utils import markov
from parrot.utils.cache import LastUpdatedOrderedDict


class MarkovModelManager:
	# A user-id, guild-id pair to uniquely identify a Member
	type Key = tuple[Snowflake, Snowflake]
	MAX_MEM_SIZE = settings.markov_cache_size_bytes

	def __init__(self, crud: CRUD):
		self.crud = crud
		self.space_used = 0
		self.cache = LastUpdatedOrderedDict[
			MarkovModelManager.Key, markov.ParrotText
		]()

	async def fetch(self, member: discord.Member) -> markov.ParrotText:
		key: MarkovModelManager.Key = (member.id, member.guild.id)
		if member.id in self.cache:
			logging.debug(f"Cache hit: {member.name}")
			self.cache.move_to_end(member.id)
			return self.cache[key]
		logging.debug(f"Cache miss: {member.id}")
		corpus = self.crud.member.get_messages_content(member)
		result = await markov.ParrotText.new(corpus)
		while self.space_used + len(result) > MarkovModelManager.MAX_MEM_SIZE:
			_, evicted = self.cache.popitem(last=False)
			logging.debug(
				f" ** Full ({self.space_used}/{MarkovModelManager.MAX_MEM_SIZE}); "
				f"evicting: {evicted} (-{len(evicted)})"
			)
			self.space_used -= len(evicted)
		self.cache[key] = result
		self.space_used += len(result)
		return result

	async def update(
		self, member: discord.Member, corpus_update: Iterable[str]
	) -> None:
		"""Update a local model in the cache. Does not affect the database."""
		partial = markov.ParrotText(corpus_update)
		current = await self.fetch(member)
		updated = cast(markov.ParrotText, markovify.combine(current, partial))
		self.set_local(member, updated)
		key: MarkovModelManager.Key = (member.id, member.guild.id)
		self.cache[key] = updated
