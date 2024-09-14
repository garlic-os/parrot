from typing import NamedTuple
from discord import User


class ConfirmationBody(NamedTuple):
    author: User  # The forget command message's author
    corpus_owner: User  # User for whose the corpus to be forgotten


# Key: Message ID of a forget command
PendingConfirmations = dict[int, ConfirmationBody]
