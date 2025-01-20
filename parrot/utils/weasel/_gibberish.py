from parrot.utils import markov


async def gibberish(text: str) -> str:
	model = await markov.Gibberish.new(text)
	original = text
	# Try up to 10 times to make it not the same as the source text
	for _ in range(10):
		text = model.make_sentence()
		if text != original:
			break
	return text
