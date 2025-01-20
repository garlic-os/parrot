"""
METHINKS IT IS LIKE A WEASEL.
Text generation and corruption algorithms
"""

from parrot.utils import markov


async def gibberish(text: str) -> str:
	model = await markov.Gibberish.new(text)
	# Generate gibberish;
	# try up to 10 times to make it not the same as the source text.
	old_text = text
	for _ in range(10):
		text = model.make_sentence()
		if text != old_text:
			break
	return text
