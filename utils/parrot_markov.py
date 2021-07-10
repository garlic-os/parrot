from typing import List

import markovify
import random


class ParrotMarkov(markovify.Text):
    def __init__(self, corpus: List[str]):
        super().__init__(
            input_text=corpus,
            state_size=random.randint(1, 3),
            retain_original=False,
            well_formed=False,
        )