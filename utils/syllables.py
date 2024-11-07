from typing import Callable


VOWELS = 'AEIOU'
CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'
CONSONANTS = CONSONANTS + CONSONANTS.lower()
VOWELS = VOWELS + VOWELS.lower()

def is_vowel(letter: str) -> bool:
    return letter in VOWELS
def is_const(letter: str) -> bool:
    return letter in CONSONANTS

type Predicate = Callable[[str], bool]


def find_syllables(word: str) -> list[str]:
    """
    A rudimentary syllable splitter for English words.
    For making wawas more interesting than random.
    https://stackoverflow.com/a/69803624
    """
    split_points: list[int] = []
    patterns: list[list[Predicate]] = [
        [is_vowel, is_const, is_vowel],
        [is_const, is_vowel, is_const],
    ]
    segment_length = len(patterns[0])

    # Find where the pattern occurs
    for i in range(len(word) - segment_length):
        segment: str = word[i:i+segment_length]
        if any([
            all([pred(letter) for letter, pred in zip(segment, pattern)])
            for pattern in patterns
        ]):
            split_points.append(i + segment_length // 2)

    # Use the index to find the syllables - add 0 and len(word) to make it work
    split_points.insert(0, 0)
    split_points.append(len(word))
    syllables: list[str] = []
    for i in range(len(split_points) - 1):
        start = split_points[i]
        end = split_points[i + 1]
        syllables.append(word[start:end])
    return syllables
