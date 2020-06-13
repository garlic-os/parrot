const config = require("./config.js")
const escapedPrefix = _escape(config.PREFIX)
const { consenting } = require("./corpus")

var client
var corpusUtils


/**
 * Check for bad words in a string.
 * 
 * @param {string} phrase - String to check for bad words in
 * @return {Boolean} Whether the string contains any bad words
 */
function _isNaughty(phrase) {
	if (!config.BAD_WORDS) return false

	phrase = phrase.replace(/[^A-z]/g, "") // Only acknowledge letters
	const words = phrase.split(" ") // Split into an array of words
	return words.some(_wordIsBad) // Returns true if any word is bad, false if none are bad
}


function _wordIsBad(word) {
	return config.BAD_WORDS.includes(word)
}


/**
 * Return the ID of the last message in a Collection of messages.
 * 
 * @param {Collection} messages - collection to find the last message ID from
 * @return {string} ID of the last message in [message]
 */
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
	const scrape_buffers = {}

	const fetchOptions = {
		limit: 100
		// _getBatchOfMessages() will set this:
		//, before: [ID of last message from previous request]
	}


	/**
	 * Absolutely awful function.
	 * Fortunately, though, now obsoleted by discord.js's new MessageCollector!
	 * https://discord.js.org/#/docs/main/stable/class/MessageCollector
	 * 
	 * Recursive function that keeps executing itself
	 *   until [goal] is met.
	 * 
	 * @param {Object} fetchOptions - options to pass to channel.fetchMessages()
	 * @return {Promise}
	 */
	async function _getBatchOfMessages(fetchOptions) {
		const messages = await channel.fetchMessages(fetchOptions)
		for (const userID in scrape_buffers) {
			// Don't let any user's scrape buffer get bigger than 1 MB
			if (scrape_buffers[userID].length > 1048576) {
				// If a scrape buffer exceeds the size limit, empty the buffer
				//   to a cache file early (before all messages have been scraped).
				_dump(userID, scrape_buffers[userID]).then( () => {
					scrape_buffers[userID] = ""
				})
			}
		}

		fetchOptions.before = _lastMessageID(messages)

		let nextBatchFinished
		// Next request won't be empty and goal is not yet met
		if (messages.size >= 100 && messagesAdded < goal) {
			nextBatchFinished = _getBatchOfMessages(fetchOptions)
		}

		for (let message of messages) {
			// In case the message is actually in message[1].
			// No, it is never in message[0].
			if (Array.isArray(message)) {
				message = message[1]
			}

			// Message has text (sometimes it can just be a picture)
			if (message.content && message.author.id !== client.user.id) {
				const authorID = message.author.id

				// Filter out messages from users to haven't agreed to the EULA
				if (!consenting.has(authorID)) {
					return
				}

				if (!scrape_buffers[authorID]) {
					scrape_buffers[authorID] = ""
				}

				scrape_buffers[authorID] += message.content + "\n"

				if (++messagesAdded >= goal) {
					break
				}
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

	// Dump any remaining messages from scrape_buffers to
	//   users' corpora
	for (const userID in scrape_buffers) {
		_dump(userID, scrape_buffers[userID])
	}

	return messagesAdded
}


const learnFrom_buffers = {}

/**
 * Record the message to the user's corpus.
 * Build up messages from that user until they have
 *   been silent for at least five seconds,
 *   then write them all to cache in one fell swoop.
 * Messages will be saved to the cloud come the next autosave.
 * 
 * @param {DiscordMessage} message - Discord message object to learn from
 */
function learnFrom(message) {
	const authorID = message.author.id

	if (!consenting.has(authorID)) {
		return
	}

	if (_isNaughty(message.content)) {
		const msg = `Bad word detected.
	${message.author.tag} (ID: ${authorID}) said:
	${message.content.substring(0, 1000)}
	https://discordapp.com/channels/${message.guild.id}/${message.channel.id}?jump=${message.id}`
		console.warn(msg)
		dmTheAdmins(msg)
	} else {
		if (!learnFrom_buffers[authorID]) {
			learnFrom_buffers[authorID] = []
		}

		// Don't learn from a message if it's just pinging Schism
		if (message.content !== `<@${client.user.id}>` && message.content !== `<@!${client.user.id}>`) {
			// Set a timeout to wait for the user to be quiet
			//   only if their buffer is empty.
			if (learnFrom_buffers[authorID].length === 0) {
				setTimeout( async () => {
					const payload = learnFrom_buffers[authorID].join("\n") + "\n"
					await corpusUtils.append(authorID, payload)
					console.log(`[LEARNING] Learned from ${message.author.tag} (ID: ${authorID}): ${payload}`)
					learnFrom_buffers[authorID] = []
				}, 5000) // Five seconds
			}

			// Duplicate protection.
			// If someone says the same message more than once within one buffer period,
			//   only add one copy of that message to their corpus.
			if (learnFrom_buffers[authorID].includes(message.content)) {
				console.log(`[LEARNING] Skipped duplicate from ${message.author.tag}:`, message.content)
			} else {
				learnFrom_buffers[authorID].push(message.content)
			}
		}
	}
}


module.exports = (input_client, input_corpusUtils) => {
	client = input_client
	corpusUtils = input_corpusUtils

	if (!client) {
		throw "Missing argument: no client provided"
	}

	if (!corpusUtils) {
		throw "Missing argument: no corpus.js provided"
	}

	return {
		scrape,
		learnFrom
	}
}
