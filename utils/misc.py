import random
import string


def is_mention(text: str) -> bool:
    """ Determine if a string is a user mention. """
    correct_beginning = text[:2] == "<@"
    not_emoji = ":" not in text
    not_channel = "#" not in text
    correct_ending = text[-1] == ">"
    return correct_beginning and not_emoji and not_channel and correct_ending
