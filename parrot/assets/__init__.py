from pathlib import Path


with Path("parrot/assets/failure_phrases.txt").open() as f:
    failure_phrases = f.readlines()
