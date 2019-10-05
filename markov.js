/**
 * Markov chain text generator
 * 
 * @example
 *     const mark = new Markov(lotsOfText)
 *     mark.generate()
 */
module.exports = class Markov {
	/**
	* Constructor
	* 
	* @param {string} input - make new sentences out of this
	* @param {integer} [outputSize] - number of words to generate
	* @param {integer} [stateSize] - chain order
	*/
	constructor(input, outputSize, stateSize) {
		if (!input) throw Error("Constructor received no input")
		this.cache = Object.create(null)
		this.words = input.split(/\s/)
		this.startWords = [this.words[0]]
		this.stateSize = stateSize || 2
		this.outputSize = outputSize || 20
		this.analyzed = false
	}


	/**
	* Chooses a random entry from an array
	* 
	* @param {Array} array
	* @return random element from an array
	*/
	_choose(arr) {
		return arr[~~( Math.random() * arr.length )] // ~~ is a "faster substitute for Math.floor()": https://stackoverflow.com/a/5971668
	}

	/**
	* Get the next set of words as a string
	*/
	_getNextSet(i) {
		return this.words.slice(i, i + this.stateSize).join(" ")
	}

	/**
	* Create a Markov lookup
	*/
	_analyze() {
		let next
		this.words.forEach( function(word, i) { // please tell me why .bind() isn't working with () => {} syntax
			next = this._getNextSet(++i)
			;(this.cache[word] = this.cache[word] || []).push(next) // please tell me what the heck a beginning semicolon means and why this doesn't work without it
			;/[A-Z]/.test(word[0]) && this.startWords.push(word)
		}.bind(this))
		return this.analyzed = true && this
	}

	/**
	* Generate new text from a Markov lookup
	*
	* @return {string} new sentence
	*/
	generate() {
		let seed, arr, choice, curr, i = 1
		!this.analyzed && this._analyze()
		arr = [seed = this._choose(this.startWords)]
		for ( ; i < this.outputSize; i += this.stateSize ){
			arr.push(choice = this._choose(curr || this.cache[seed]))
			curr = this.cache[choice.split(" ").pop()]
		}
		return arr.join(" ")// + "."
	}
}
