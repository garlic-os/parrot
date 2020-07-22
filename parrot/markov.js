var corpusUtils;
const MarkovChain = require("purpl-markov-chain");


/**
 * Generate a sentence based off [userID]'s corpus.
 * 
 * @param {string} userID - ID corresponding to a user to generate a sentence from
 * @return {Promise<string>} Markov-generated sentence
 */
async function generateSentence(userID) {
	const corpus = await corpusUtils.load(userID);
	const sentenceCount = ~~(Math.random() * 4 + 1); // 1-5 sentences
	const chain = new MarkovChain();
	chain.config.grams = ~~(Math.random() * 2 + 1); // State size 1-3

	for (const line of corpus.split("\n")) {
		chain.update(line);
	}

	let phrase = "";

	for (let i = 0; i < sentenceCount; ++i) {
		phrase += chain.generate();
	}

	return phrase;
}


/**
 * @param {Object} input_corpusUtils - An instance of corpus.js
 */
module.exports = (input_corpusUtils) => {
	corpusUtils = input_corpusUtils;

	if (!corpusUtils) {
		throw "Missing argument: no corpus.js provided";
	}

	return generateSentence;
};
