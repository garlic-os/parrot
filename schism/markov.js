"use strict"

const regex = require("./regex")

var corpusUtils
var client

/**
 * A function that makes Markov chain sentences.
 * I didn't make this, but the lengths the author
 *   managed to go in the name of efficiency is insane.
 * 
 * I have heavily modified it to be better for one-time use,
 *   since Schism will only use a Markov once before
 *   throwing it away to make a new one with different data.
 * 
 * @param {string} corpus - big body of text to make a new, similar-sounding sentence from
 * @param {number} [outputSize=20] - number of words to generate (default: 20)
 * @param {number} [stateSize=4] - chain order (default: 2)
 * @return {Promise<string>} new sentence based from the corpus
 */
async function _markovChain(corpus, outputSize=20, stateSize=4) {
	if (!corpus) throw "_markovChain(): did not receive a corpus"
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
		return arr[~~(Math.random() * arr.length)] // ~~ is a "faster substitute for Math.floor()": https://stackoverflow.com/a/5971668
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
 * Parse <@6813218746128746>-type mentions into @user#1234-type mentions.
 * This way, mentions won't actually ping any users.
 * 
 * This is a naughty one:
 * https://repl.it/@Garlic_OS/disablePings-debugging
 * 
 * @param {string} sentence - sentence to disable pings in
 * @return {Promise<string>} sentence that won't ping anyone
 */
async function _disablePings(sentence) {
	return await _replaceAsync(sentence, regex.mention, async mention => {
		const userID = mention.match(regex.id)[0]
		try {
			const user = await client.fetchUser(userID)
			return "@" + user.tag
		} catch (err) {
			console.debug(`  [DEBUG]   markov.js _disablePings() error. mention: ${mention}. userID: ${userID}.`, err)
			return ""
		}
	})
}


/**
 * Get an element from a Set.
 * 
 * @param {Set} setObj - Set to get the element from
 * @param {number} index - position of element in the Set
 * @return {any} [index]th element in the Set
 */
function _elementAt(setObj, index) {
	if (index < 0 || index > setObj.size - 1) return // Index out of range; return undefined
	const iterator = setObj.values()
	for (let i=0; i<index-1; ++i) {
		// Increment the iterator index-1 times.
		// The iterator value after this one is the element we want.
		iterator.next()
	}

	return iterator.next().value
}


/**
 * Generate a sentence based off [userID]'s corpus.
 * 
 * @param {string} userID - ID corresponding to a user to generate a sentence from
 * @return {Promise<string>} Markov-generated sentence
 */
async function generateSentence(userID) {
	const corpus = await corpusUtils.load(userID)
	    , wordCount = ~~(Math.random() * 49 + 1) // 1-50 words
	    , coherence = Math.round(Math.random() * 7 + 3) // State size 3-10

	let sentence = await _markovChain(corpus, wordCount, coherence)
	sentence = sentence.substring(0, 256) // Hard cap of 256 characters (any longer is just too big)
	sentence = await _disablePings(sentence)
	return sentence
}


/**
 * Choose a random user ID that Schism can imitate.
 * 
 * @return {Promise<string>} userID
 */
async function randomUserID() {
	const userIDs = await corpusUtils.allUserIDs()
	let tries = 0
	while (++tries < 100) {
		const index = ~~(Math.random() * userIDs.size - 1)
		const userID = _elementAt(userIDs, index)
		try {
			await client.fetchUser(userID) // Make sure the user exists
			return userID
		} catch (e) {
			console.debug(`  [DEBUG]   markov.js randomUserID() error ${userID}`)
		} // The user doesn't exist; loop and *try* again
	}
	throw `randomUserID(): Failed to find a userID after ${tries} attempts`
}


/**
 * @param {Client} input_client - A Discord client for markov.js to use
 * @param {Object} input_corpusUtils - An instance of corpus.js
 */
module.exports = (input_client, input_corpusUtils) => {
	client = input_client
	corpusUtils = input_corpusUtils

	if (!client) throw "Missing argument: no client provided"
	if (!corpusUtils) throw "Missing argument: no corpus.js provided"

	return {
		generateSentence,
		randomUserID
	}
}
