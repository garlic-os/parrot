from typing import Dict, NamedTuple, Union
from discord import DMChannel, GroupChannel, TextChannel, User


class CorpusMessage(NamedTuple):
    content: str  # Discord.Message.content
    timestamp: float  # Discord.Message.created_at.timestamp()

# Key: Discord.Message.id
Corpus = Dict[int, CorpusMessage]


class ConfirmationBody(NamedTuple):
    author: User  # The forget command message's author
    corpus_owner: User  # User for whose the corpus to be forgotten

# Key: Message ID of a forget command
PendingConfirmations = Dict[int, ConfirmationBody]

# Any kind of channel
Channel = Union[DMChannel, GroupChannel, TextChannel]


class ModifiedAvatar(NamedTuple):
    original_avatar_url: str
    modified_avatar_url: str
    source_message_id: int
