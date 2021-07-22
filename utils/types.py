from typing import Dict, NamedTuple, TypedDict
from discord import User


class ConfirmationBody(NamedTuple):
    author: User  # The forget command message's author
    corpus_owner: User  # User for whose the corpus to be forgotten

# Key: Message ID of a forget command
PendingConfirmations = Dict[int, ConfirmationBody]

class ModifiedAvatar(TypedDict):
    original_avatar_url: str
    modified_avatar_url: str
    source_message_id: int
