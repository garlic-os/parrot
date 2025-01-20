import random
from collections.abc import Iterable
from typing import Self

import markovify

from parrot.utils import cast_not_none, executor_function


class ParrotText(markovify.Text):
	def __init__(
		self,
		corpus: Iterable[str],
		# Unused in Parrot except to retain compatibility with markovify.combine
		parsed_sentences: list[list[str]] | None = None,
		state_size: int = 2,
		chain: markovify.Chain | None = None,
	):
		super().__init__(
			input_text=corpus,
			state_size=random.randint(1, 2),
			retain_original=False,
			well_formed=False,
			parsed_sentences=parsed_sentences,
			chain=chain,
		)

	@classmethod
	@executor_function
	def new(cls, corpus: Iterable[str]) -> Self:
		"""
		Construct the Markov chain generator in a new thread/process to remain
		non-blocking.
		"""
		return cls(corpus)

	def __len__(self):
		return len(self.chain.model)


class Gibberish(markovify.Text):
	"""
	Feed the corpus to the Markov model character-by-character instead of
	word-by-word for extra craziness!
	"""

	def __init__(self, text: str):
		super().__init__(
			None,
			parsed_sentences=[list(text)],
			state_size=random.randint(1, 2),
			retain_original=False,
			well_formed=False,
		)
		self.original = text

	@classmethod
	@executor_function
	def new(cls, text: str) -> Self:
		return cls(text)

	def word_join(self, words: list[str]) -> str:
		# The generator usually puts spaces between each entry in the list
		# because it expects them to be words. Since they're actually characters
		# here, we join the list without spaces.
		# I could be smarter about this and make it use a string instead of a
		# list of strings, but I would have to modify markovify.Chain to do that
		# and I don't want to!
		return "".join(words)

	def make_sentence(
		self, init_state: tuple[str, ...] | None = None, **kwargs: dict
	) -> str:
		# Make some gibberish. If it ends up the same as the original text,
		# maybe try again. But not always, because sometimes it's funny!
		acceptable = False
		sentence = ""
		while not acceptable:
			sentence = super().make_sentence(init_state=init_state, **kwargs)
			acceptable = sentence is not None and (
				sentence != self.original or random.random() < 0.5
			)
		return cast_not_none(sentence)
