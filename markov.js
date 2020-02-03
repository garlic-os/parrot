"use strict"

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
 *
 * @example
 *     const markov = require("./markov")
 *     markov(lotsOfText)
 *         .then(console.log)
 */
module.exports = async (corpus, outputSize=20, stateSize=4) => {
	if (!corpus) throw "Markov did not receive a corpus"
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
