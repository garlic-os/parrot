"use strict"

const { PREFIX } = process.env || require("./defaults")
const escapedPrefix = _escape(PREFIX)

var client
var corpusUtils


function _lastMessageID(messages) {
	// Sometimes the last message is just undefined. No idea why.
	let lastMessages = messages.last()
	let toLast = 2
	while (!lastMessages[0]) {
		lastMessages = messages.last(toLast++) // Second-to-last message (or third-to-last, etc.)
	}

	const lastMessage = lastMessages[0]

	// Sometimes the actual message is in "message[1]", instead "message". No idea why.
	return (Array.isArray(lastMessage))
		? lastMessage[1].id
		: lastMessage.id
}


/**
 * Filter out matches to a filter from [userID]'s buffer,
 *   then append it to that user's corpus
 * 
 * @param {string} userID - user ID whose buffer to dump
 * @param {string} data - data to dump to the corpus
 * @return {Promise} corpusUtils.append() promise
 */
function _dump(userID, data) {
	// Filter out Schism commands
	const filter = new RegExp(`^${escapedPrefix}.+`, "gim")
	const filteredData = data.replace(filter, "")

	return corpusUtils.append(userID, filteredData)
}


/**
 * Put \ before every character in a string.
 * 
 * @param {string} str - string to be escaped
 * @return {string} escaped string
 */
function _escape(str) {
	let output = ""
	for (const char of str.split("")) {
		output += "\\" + char
	}
	return output
}


/**
 * Scrape [goal] messages from [channel],
 *   then add the messages to their corresponding
 *   user's corpus.
 *
 * @param {TextChannel} channel - what channel to scrape
 * @param {number} goal - number of messages to scrape
 * @return {Promise<number>} number of messages added
 */
async function scrape(channel, goal) {
	let messagesAdded = 0
	const buffers = {}

	const fetchOptions = {
		limit: 100
		// _getBatchOfMessages() will set this:
		//, before: [ID of last message from previous request]
	}


	/**
	 * I hate this function.
	 * Here be dragons.
	 * 
	 * Recursive function that keeps executing itself
	 *   until [goal] is met.
	 * 
	 * @param {Object} fetchOptions - options to pass to channel.fetchMessages()
	 * @return {Promise}
	 */
	async function _getBatchOfMessages(fetchOptions) {
		const messages = await channel.fetchMessages(fetchOptions)
		for (const userID in buffers) {
			// Don't let any user's scrape buffer get bigger than 1 MB
			if (buffers[userID].length > 1048576) {
				// If a scrape buffer exceeds the size limit, empty the buffer
				//   to a cache file early (before all messages have been scraped).
				_dump(userID, buffers[userID]).then( () => {
					buffers[userID] = ""
				})
			}
		}

		fetchOptions.before = _lastMessageID(messages)

		let nextBatchFinished
		// Next request won't be empty and goal is not yet met
		if (messages.size >= 100 && messagesAdded < goal)
			nextBatchFinished = _getBatchOfMessages(fetchOptions)

		for (let message of messages) {
			// In case the message is actually in message[1].
			// No, it is never in message[0].
			if (Array.isArray(message)) message = message[1]

			// Message has text (sometimes it can just be a picture)
			if (message.content && message.author.id !== client.user.id) {
				const authorID = message.author.id
				if (!buffers[authorID]) buffers[authorID] = ""
				buffers[authorID] += message.content + "\n"
				if (++messagesAdded >= goal) break
			}
		}

		// Wait for the next batch to finish if it exists.
		// If it fails or it never executed (goal already met),
		//   just move on immediately.
		try {
			await nextBatchFinished
		} catch (e) {}
		return
	}

	// Wait for [goal] number of messages to be scraped
	await _getBatchOfMessages(fetchOptions)

	// Dump any remaining messages from buffers to
	//   users' corpi
	for (const userID in buffers) {
		_dump(userID, buffers[userID])
	}

	return messagesAdded
}


module.exports = (input_client, input_corpusUtils) => {
	client = input_client
	corpusUtils = input_corpusUtils

	if (!client) throw "Missing argument: no client provided"
	if (!corpusUtils) throw "Missing argument: no corpus.js provided"

	return scrape
}
