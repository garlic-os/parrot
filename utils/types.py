from typing import Dict, NamedTuple


class CorpusMessage(NamedTuple):
    content: str
    timestamp: str


Corpus = Dict[str, CorpusMessage]
