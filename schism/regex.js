module.exports = {
	/**
	 * All instances of <@[userID]>, including the outer characters.
	 * An ! exclamation point is present when the user has a nickname
	 *   on the server the message was sent from.
	 * An & ampersand is present when it is a role mention, like @moderators.
	 */
	mention: /<@([!&]*)[0-9]+>/g

	/**
	 * The string of numbers inside an instance of <@[userID]>.
	 */
	, id: /[0-9]+/
}
