# Gibberish Generator (JavaScript).
# Algorithm: Letter-based Markov text generator.
# Keith Enevoldsen, thinkzone.wlonk.com

import random

def _char_at(text: str, index: int) -> str:
    try:
        return text[index]
    except IndexError:
        return ""


def _index_of(text: str, substring: str, start: str=None, end: str=None) -> int:
    try:
        return text.index(substring, start, end)
    except ValueError:
        return -1


def gibberish(text: str, state_size: int=None, length: int=None) -> str:
    if state_size is None:
        state_size = random.randint(2, 4)

    if length is None:
        if random.randint(0, 1):
            length = random.randint(1, 20)
        else:
            length = random.randint(150, 450)

    # Make the string contain two copies of the input text.
    # This allows for wrapping to the beginning when the end is reached.
    text += " "
    num_chars = len(text)
    text += text

    if num_chars < state_size:
        raise ValueError(f"Input must be longer than {state_size} characters.")

    # Pick a random starting character, preferably an uppercase letter.
    for _ in range(1000):
        char_index = random.randint(0, num_chars)
        char = _char_at(text, char_index)
        if char.isupper():
            break

    # Write starting characters.
    output = text[char_index:char_index + state_size]

    # Set target string.
    target = text[char_index + 1:char_index + state_size]

    # Generate characters.
    for _ in range(length):
        if state_size == 1:
            # Pick a random character.
            char = _char_at(text, random.randint(0, num_chars))
        else:
            # Find all sets of matching target characters.
            num_matches = 0
            i = -1
            while True:
                i = _index_of(text, target, i + 1)
                if i < 0 or i >= num_chars:
                    break
                else:
                    num_matches += 1

            # Pick a match at random.
            match_index = random.randint(0, num_matches)

            num_matches = 0
            i = -1
            while True:
                i = _index_of(text, target, i + 1)
                if i < 0 or i >= num_chars:
                    break
                elif match_index == num_matches:
                    char = _char_at(text, i + state_size - 1)
                else:
                    num_matches += 1

        # Output the character.
        output += char

        # Update the target.
        if state_size > 1:
            target = target[1:state_size - 1] + char

    return output
