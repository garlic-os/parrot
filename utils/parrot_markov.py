from utils.types import Corpus
from typing import List

import markovify
import random


class ParrotMarkov(markovify.Text):
    """
    A subclass of markovify.Text customized for use with Parrot.
    This class takes in a Parrot Corpus instead of a string and sends the
      sentences within the Corpus straight to the Markov chain's
      parsed_sentences parameter. This also bypasses the chain's need for
      its input to be well-punctuated for parsing. Because Heaven knows you're
      not going to get that when the dataset is coming from Discord.

    Parrot Corpora also don't have any limit on how large they can get, so I
      thought it would be a good idea to tell the Markov constructor not to
      keep its corpus in memory.

    The state size of each instance is now a random choice between 2 and 3.
    """

    def __init__(self, corpus: Corpus, state_size: int = 2) -> None:
        super().__init__(
            None,
            parsed_sentences=ParrotMarkov.parse_corpus(corpus),
            state_size=random.randint(2, 3),
            retain_original=False,
        )

    @staticmethod
    def parse_corpus(corpus: Corpus) -> List[List[str]]:
        """
        Parse a Corpus into a format that markovify likes.
        Rows are sentences; columns are the words in the sentence.
        """
        return [message.content.split(" ") for message in corpus.values()]
        # sentences = []
        # for message in corpus.values():
        #     sentences.append(message.content.split(" "))
        # return sentence
