const Markov = require("markov-strings").default
var corpusUtils


/**
 * Quick and dirty Markov chain text generator
 * By kevincennis on GitHub
 * https://gist.github.com/kevincennis/5440878
 * 
 * I have modified this algorithm to be better for one-time use,
 *   since Schism will only use a Markov once before
 *   throwing it away to make a new one with different data.
 * 
 * @param {string} corpus - big body of text to make a new, similar-sounding sentence from
 * @param {number} ?outputSize=20 - number of words to generate
 * @param {number} ?stateSize=2
 * @return {string} new sentence based from the corpus
 */
function _markovChain(corpus, outputSize=20, stateSize=2) {
	if (!corpus) {
		throw "_markovChain(): did not receive a corpus."
	}

	corpus = corpus.split("\n")

	const markov = new Markov(corpus, { stateSize })
	markov.buildCorpus()

	const options = { maxTries: 100 }

	let output = ""

	while (true) {
		output += markov.generate(options).string

		if (output.length === outputSize) {
			console.debug("=== path. typeof output:", typeof output)
			return output
		} else if (output.length > outputSize) {
			console.debug("> path. typeof output:", typeof output)
			return output.split(" ").slice(0, outputSize).join(" ")
		}

		output += " "
	}
}


/**
 * Generate a sentence based off [userID]'s corpus.
 * 
 * @param {string} userID - ID corresponding to a user to generate a sentence from
 * @return {Promise<string>} Markov-generated sentence
 */
async function generateSentence(userID) {
	const corpus = await corpusUtils.load(userID)
	const wordCount = ~~(Math.random() * 49 + 1) // 1-50 words

	let sentence = _markovChain(corpus, wordCount)
	return sentence
}


/**
 * @param {Object} input_corpusUtils - An instance of corpus.js
 */
module.exports = (input_corpusUtils) => {
	corpusUtils = input_corpusUtils

	if (!corpusUtils) {
		throw "Missing argument: no corpus.js provided"
	}

	return generateSentence
}
