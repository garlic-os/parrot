from typing import Dict, NamedTuple, Union
from discord import DMChannel, GroupChannel, TextChannel, User


class CorpusMessage(NamedTuple):
    # Discord.Message.content
    content: str

    # str(Discord.Message.created_at)
    timestamp: str

# Key: Discord.Message.id
Corpus = Dict[int, CorpusMessage]


class ConfirmationBody(NamedTuple):
    # The forget command message's author
    author: User

    # User for whose the corpus to be forgotten
    corpus_owner: User

# Key: Message ID of a forget command
PendingConfirmations = Dict[int, ConfirmationBody]

# Any kind of channel
Channel = Union[DMChannel, GroupChannel, TextChannel]
