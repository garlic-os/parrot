var corpusUtils
var client


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
 * @param {number} [outputSize=20] - number of words to generate (default: 20)
 * @param {number} [stateSize=3] - chain order (default: 3)
 * @return {Promise<string>} new sentence based from the corpus
 */
async function _markovChain(corpus, outputSize=20, stateSize=3) {
	if (!corpus) {
		throw "_markovChain(): did not receive a corpus"
	}

	const cache = Object.create(null) // An object without its usual methods (e.g. .hasOwnProperty())
	const words = corpus.split(/\s/)
	const startWords = [words[0]]
	let next

	/**
	 * Choose a random entry from an array
	 * 
	 * @param {Array} array
	 * @return random element from an array
	 */
	function _choose(arr) {
		return arr[~~(Math.random() * arr.length)] // ~~() is a "faster substitute for Math.floor()": https://stackoverflow.com/a/5971668
	}

	/**
	 * Get the next set of words as a string
	 */
	function _nextSet(i) {
		return words.slice(i, i + stateSize).join(" ")
	}

	/**
	 * Analyze corpus
	 */
	words.forEach( function(word, i) { // node.js refuses to .bind() with arrow function syntax
		next = _nextSet(++i)
		;(cache[word] = cache[word] || []).push(next) // node.js explodes without semicolons here
		;/[A-Z]/.test(word[0]) && startWords.push(word) // do startWords.push(word) if regex passes
	}.bind(this))

	/**
	 * Generate a sentence
	 */
	let seed, arr, choice, curr, i = 1
	arr = [seed = _choose(startWords)]
	for (; i < outputSize; i += stateSize) { // use semicolon to skip defining the iterator (already defined above)
		arr.push(choice = _choose(curr || cache[seed])) // cache[seed] if curr is undefined
		curr = cache[choice.split(" ").pop()]
	}
	return arr.join(" ")
}


/**
 * An asynchronous version of String.prototype.replace().
 * Created by Overcl9ck on StackOverflow:
 * https://stackoverflow.com/a/48032528
 * 
 * @param {string} str - string to run the function on
 * @param {RegExp} regex - match to this regular expression
 * @param {Function} asyncFn - function to be invoked to replace the matches to [regex]
 * @return {string} string with matches to [regex] processed by [asyncFn]
 */
async function _replaceAsync(str, regex, asyncFn) {
    const promises = []
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args)
        promises.push(promise)
    })
    const data = await Promise.all(promises)
    return str.replace(regex, () => data.shift())
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

	let sentence = await _markovChain(corpus, wordCount, 3)
	sentence = sentence.substring(0, 256) // Hard cap of 256 characters (any longer is just too big)
	return sentence
}


/**
 * @param {Client} input_client - A Discord client for markov.js to use
 * @param {Object} input_corpusUtils - An instance of corpus.js
 */
module.exports = (input_client, input_corpusUtils) => {
	client = input_client
	corpusUtils = input_corpusUtils

	if (!client) {
		throw "Missing argument: no client provided"
	}

	if (!corpusUtils) {
		throw "Missing argument: no corpus.js provided"
	}

	return generateSentence
}
