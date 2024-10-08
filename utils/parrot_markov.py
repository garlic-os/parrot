import markovify
import random
from utils import executor_function


class ParrotMarkov(markovify.Text):
    def __init__(self, corpus: list[str]):
        super().__init__(
            input_text=corpus,
            state_size=random.randint(1, 2),
            retain_original=False,
            well_formed=False,
        )

    @classmethod
    @executor_function
    def new(cls, *args, **kwargs):
        return cls(*args, **kwargs)


class GibberishMarkov(markovify.Text):
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
    def new(cls, *args, **kwargs):
        return cls(*args, **kwargs)

    def word_join(self, words: list[str]) -> str:
        # The generator usually puts spaces between each entry in the list
        # because it expects them to be words. Since they're actually characters
        # here, we join the list without spaces.
        # I could be smarter about this and make it use a string instead of a
        # list of strings, but I would have to modify markovify.Chain to do that
        # and I don't want to!
        return "".join(words)

    def make_sentence(self, init_state=None, **kwargs):
        # Make some gibberish. If it ends up the same as the original text,
        # maybe try again. But not always, because sometimes it's funny!
        acceptable = False
        while not acceptable:
            sentence = super().make_sentence(init_state=init_state, **kwargs)
            acceptable = sentence != self.original or random.random() < 0.5
        return sentence
