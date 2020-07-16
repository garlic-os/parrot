module.exports = {
	/**
	 * A user mention.
	 * 
	 * @type {RegExp}
	 */
	mention: /<@(!*)[0-9]+>/g

	/**
	 * A role mention.
	 * 
	 * @type {RegExp}
	 */
	, role: /<@(&*)[0-9]+>/g

	/**
	 * The string of numbers inside an instance of <@[userID]>.
	 * 
	 * @type {RegExp}
	 */
	, id: /[0-9]+/

	/**
	 * Things that should not be capitalized:
	 * - emojis (start with < and end with >)
	 * - URLs (contain '://' somewhere in the middle)
	 * 
	 * @type {RegExp}
	 */
	, doNotCapitalize: /(^<.*>$)|(^.+:\/\/.+$)/
}
