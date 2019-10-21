/**
 * A generator that makes Markov chain sentences.
 * I didn't make this, but the lengths they
 *   managed to go in the name of efficiency is insane.
 * 
 * I have heavily modified it to be better for one-time use,
 *   since Bipolar will typically only use a Markov once before
 *   throwing it away and regenerating it.
 * 
 * @param {string} corpus - big body of text to make a new, similar-sounding sentence from
 * @param {integer} [outputSize] - number of words to generate (default: 20)
 * @param {integer} [stateSize] - chain order (default: 2)
 *
 * @example
 *     console.log(markov(lotsOfText))
 */
module.exports = (corpus, outputSize=20, stateSize=2) => {
	return new Promise( (resolve, reject) => {
		if (!corpus) return reject("Markov did not receive a corpus")
		const cache = Object.create(null) // An object without its usual methods (e.g. .hasOwnProperty())
		const words = corpus.split(/\s/)
		const startWords = [words[0]]
		let next

		/**
		 * Chooses a random entry from an array
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
		words.forEach( function(word, i) { // I don't understand why .bind() isn't working with arrow function syntax
			next = _nextSet(++i)
			;(cache[word] = cache[word] || []).push(next) // I don't understand why these lines crash without semicolons
			;/[A-Z]/.test(word[0]) && startWords.push(word) // startWords.push(word) if regex passes
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
		resolve(arr.join(" "))
	})
}
