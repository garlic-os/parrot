from typing import List

import markovify
import random


class ParrotMarkov(markovify.Text):
    def __init__(self, corpus: List[str]):
        super().__init__(
            input_text=corpus,
            state_size=random.randint(1, 2),
            retain_original=False,
            well_formed=False,
        )


class GibberishMarkov(markovify.Text):
    """
    Feed the corpus to the Markov model character-by-character instead of
    word-by-word for extra craziness!
    """
    def __init__(self, text: str):
        super().__init__(
            None,
            parsed_sentences=[list(text)],
            state_size=random.randint(1, 3),
            retain_original=False,
            well_formed=False,
        )

    def make_sentence(self, init_state=None, **kwargs):
        # The generator puts spaces between each character now because it thinks
        # they're words. To band-aid this, we can just remove every other
        # character to take out the extra spaces.
        return super().make_sentence(init_state=init_state, **kwargs)[::2]
