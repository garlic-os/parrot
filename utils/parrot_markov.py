from utils.types import Corpus
from typing import List

import markovify
import random


class ParrotMarkov(markovify.NewlineText):
    """
    A subclass of markovify.Text customized for use with Parrot.
    This class takes in a Parrot Corpus instead of a string and sends the
    sentences within the Corpus straight to the Markov chain's parsed_sentences
    parameter. This also disables the chain's need for its input to be
    well-punctuated for parsing. Because Heaven knows you're not going to get
    that when the dataset is coming from Discord.

    Parrot Corpora also don't have any limit on how large they can get, so I
    thought it would be a good idea to tell the constructor not to keep its
    corpus in memory.

    The state size of each instance is now a random choice between 2 and 3.
    """

    def __init__(self, corpus: Corpus, state_size: int = 2) -> None:
        super().__init__(
            self.parse_corpus(corpus),
            state_size=random.randint(2, 3),
            retain_original=False,
            well_formed=False,
        )

    def parse_corpus(self, corpus: Corpus) -> str:
        """ Parse a Corpus into one, long, newline-delimited string. """
        sentences = ""
        for message in corpus.values():
            sentences += message["content"] + "\n"
        return sentences
