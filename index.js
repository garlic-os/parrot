"use strict"

// Permissions code: 67584
// Send messages, read message history

// Load environment variables to const config
// JSON parse any value that is JSON parseable
const config = require("./defaults")
for (const key in process.env) {
	try {
		config[key] = JSON.parse(process.env[key])
	} catch (e) {
		config[key] = process.env[key]
	}
}

// Log errors when in production; crash when not in production
if (config.NODE_ENV === "production")
	process.on("unhandledRejection", logError)
else
	process.on("unhandledRejection", up => { throw up })

// Overwrite console methods with empty ones and don't require
//   console-stamp if logging is disabled
if (config.DISABLE_LOGS) {
	const methods = ["log", "debug", "warn", "info", "table"]
    for (const method of methods) {
        console[method] = () => {}
    }
} else {
	require("console-stamp")(console, {
		datePrefix: "",
		dateSuffix: "",
		pattern: " "
	})
}


const log = {
    say:     message => console.log(`${location(message)} Said: ${message.embeds[0].fields[0].value}`)
  , imitate: {
    	text: ([ message, name, sentence ]) => console.log(`${location(message)} Imitated ${name}, saying: ${sentence}`),
    	hook: hookRes => console.log(`${location(hookRes)} Under the name "${hookRes.author.username}", said: ${hookRes.content}`)
	}
  , error:   message => console.log(`${location(message)} Sent the error message: ${message.embeds[0].fields[0].value}`)
  , xok:     message => console.log(`${location(message)} Sent the XOK message.`)
  , help:    message => console.log(`${location(message)} Sent the Help message.`)
  , save:    count   => `Saved ${count} ${(count === 1) ? "corpus" : "corpi"}.`
  , pinged:  message => console.log(`${location(message)} Pinged by ${message.author.tag}.`)
  , command: message => console.log(`${location(message)} Received a command from ${message.author.tag}: ${message.content}`)
  , blurt:   message => console.log(`${location(message)} Randomly decided to imitate someone in response to ${message.author.tag}'s message.`)
}


// (Hopefully) save and clear cache before shutting down
process.on("SIGTERM", () => {
	console.info("Saving changes...")
	corpusUtils.saveAll()
		.then(savedCount => console.log(log.save(savedCount)))
})

// Requirements
const Discord     = require("discord.js")
	, corpusUtils = require("./corpus")
    , embeds      = require("./embeds")
	, help        = require("./help")
	, markov      = require("./markov")


// Array of promises
// Do all these things before logging in
const init = []

// Set BAD_WORDS if BAD_WORDS_URL is defined
if (config.BAD_WORDS_URL) {
	init.push(httpsDownload(config.BAD_WORDS_URL)
		.then(rawData => config.BAD_WORDS = rawData.split("\n")))
}

const buffers = {}
const hookSendQueue = []

const client = new Discord.Client()
const hooks = parseHooksDict(config.HOOKS)

// --- LISTENERS ---------------------------------------------

client.on("ready", () => {
	console.info(`Logged in as ${client.user.tag}.\n`)
	updateNicknames(config.NICKNAMES)

	// Limit the rate at which Webhook messages can be sent
	setInterval( () => {
		const pair = hookSendQueue.pop()
		if (!pair) return

		const [ hook, sentence ] = pair
		hook.send(sentence)
			.then(log.imitate.hook)
	}, 1000) // One second

	// "Watching everyone"
	client.user.setActivity(`everyone (${config.PREFIX}help)`, { type: "WATCHING" })
		.then( ({ game }) => console.info(`Activity set: ${status(game.type)} ${game.name}`))

	channelTable(config.SPEAKING_CHANNELS).then(table => {
		console.info("Speaking in:")
		console.table(table)
	})
	.catch(console.warn)

	channelTable(config.LEARNING_CHANNELS).then(table => {
		console.info("Learning in:")
		console.table(table)
	})
	.catch(console.warn)

	nicknameTable(config.NICKNAMES).then(table => {
		console.info("Nicknames:")
		console.table(table)
	})
	.catch(console.info)

})


client.on("message", async message => {
	const authorID = message.author.id
	const channelID = message.channel.id

	if (message.content.length > 0 // Not empty
	   && !isBanned(authorID) // Not banned from using Schism
	   && !isHook(authorID) // Not a Webhook
	   && message.author.id !== client.user.id) { // Not self

	   if (canSpeakIn(channelID) // Channel is listed in SPEAKING_CHANNELS or is a DM channel
		  || message.channel.type === "dm") {

			// Ping
			if (message.isMentioned(client.user) // Mentioned
			&& !message.content.includes(" ")) { // Has no spaces (i.e. contains nothing but a ping))
				log.pinged(message)
				const userID = await randomUserID()
				imitate(userID, message.channel)
			}

			// Command
			else if (message.content.startsWith(config.PREFIX) // Starts with the command prefix
			        && !message.author.bot) { // Not a bot
				handleCommand(message)
			}
			
			// Nothing special
			else if (blurtChance()) { // Maybe imitate someone anyway
				log.blurt(message)
				const userID = await randomUserID()
				imitate(userID, message.channel)
			}
		}

		if (learningIn(channelID) // Channel is listed in LEARNING_CHANNELS (no learning from DMs)
		   && !message.content.startsWith(config.PREFIX)) { // Not a command
			/**
			 * Record the message to the user's corpus.
			 * Builds up messages from that user until they have
			 *   been silent for at least five seconds,
			 *   then writes them all to cache in one fell swoop.
			 * Messages will be saved to the cloud come the next autosave.
			 */
			if (buffers.hasOwnProperty(authorID) && buffers[authorID].length > 0) {
				buffers[authorID] += message.content + "\n"

			} else {
				buffers[authorID] = message.content + "\n"
				setTimeout( async () => {
					const buffer = await cleanse(buffers[authorID])
					if (buffer.length === 0) return

					if (!corpusUtils.local.includes(authorID))
						corpusUtils.local.push(authorID)

					await corpusUtils.append(authorID, buffer)
					if (!corpusUtils.unsaved.includes(authorID))
						corpusUtils.unsaved.push(authorID)

					console.log(`${location(message)} Learned from ${message.author.tag}:`, buffer)
					buffers[authorID] = ""
				}, 5000) // Five seconds
			}
		}
	}
})


client.on("guildCreate", guild => {
	console.info(`---------------------------------
Added to a new server.
${guild.name} (ID: ${guild.id})
${guild.memberCount} members
---------------------------------`)
})

client.on("guildDelete", guild => {
	console.info(`---------------------------------
Removed from a server.
${guild.name} (ID: ${guild.id})
---------------------------------`)
})

// --- /LISTENERS --------------------------------------------

// --- LOGIN -------------------------------------------------

// When all initalization steps have finished
Promise.all(init).then( () => {
	console.info("Logging in...")
	client.login(process.env.DISCORD_BOT_TOKEN)

	// Autosave
	setInterval( async () => {
		const savedCount = await corpusUtils.saveAll()
		console.log(log.save(savedCount))
	}, 3600000) // One hour
})
.catch( () => {
	console.error("One or more initialization steps have failed:")
	console.error(init)
	throw "Startup failure"
})


// --- /LOGIN ------------------------------------------------

// --- FUNCTIONS ---------------------------------------------


/**
 * Generates a sentence based off [userID]'s corpus
 * 
 * @param {string} userID - ID corresponding to a user to generate a sentence from
 * @return {Promise<string|Error>} Resolve: sentence; Reject: error loading user's corpus
 */
async function generateSentence(userID) {
	const corpus = await corpusUtils.load(userID)
	    , wordCount = ~~(Math.random() * 49 + 1) // 1-50 words
	    , coherence = Math.round(Math.random() * 7 + 3) // State size 3-10
	let sentence = await markov(corpus, wordCount, coherence)
	sentence = sentence.substring(0, 512) // Hard cap of 512 characters (any longer is just too big)
	return sentence
}


async function imitate(userID, channel) {
	const sentence = await disablePings(await generateSentence(userID))
	let avatarURL, name

	try {
		// Try to get the information from the server the user is in,
		// so that Schism can use the user's nickname.
		const member = await channel.guild.fetchMember(userID)
		avatarURL = member.user.displayAvatarURL
        name = `Not ${member.displayName}`
	} catch (err) {
		// If Schism can't get the user from the server,
		// use the user's ID for their name
		// and the default avatar.
		avatarURL = "https://cdn.discordapp.com/attachments/280298381807714304/661400836605345861/322c936a8c8be1b803cd94861bdfa868.png"
        name = `Ghost of user ${userID}`
	}

	const hook = hooks[channel.id]
	if (hook) {
		if (hook.name !== name) // Only change appearance if the current user to imitate is different from the last user Schism imitated
			await hook.edit(name, avatarURL)
		hookSendQueue.push([hook, sentence])
	} else {
		avatarURL = avatarURL.replace("?size=2048", "?size=64")
		channel.send(`${name}​ be like:\n${sentence}\n${avatarURL}`)
			.then(message => log.imitate.text([message, name, sentence]))
	}
}


async function randomUserID() {
	while (true) { // no no potentially infinite loop is ok because its async see everything is fine
		const index = ~~(Math.random() * corpusUtils.local.length - 1)
		const userID = corpusUtils.local[index]
		try {
			await client.fetchUser(userID) // Make sure the user exists
			return userID
		} catch (err) {} // The user doesn't exist; loop and (literally) try again
	}
}


/**
 * Scrapes [howManyMessages] messages from [channel].
 * Adds the messages to their corresponding user's corpus.
 * 
 * Here be dragons.
 *
 * @param {Channel} channel - what channel to scrape
 * @param {number} howManyMessages - number of messages to scrape
 * @return {Promise<number|Error>} number of messages added
 */
function scrape(channel, goal) {
	const fetchOptions = { limit: 100 /*, before: [last message from previous request]*/ }
	let activeLoops = 0
	let messagesAdded = 0
	const scrapeBuffers = {}

	async function _getBatchOfMessages(fetchOptions) {
		activeLoops++
		const messages = await channel.fetchMessages(fetchOptions)
		for (const userID in scrapeBuffers) {
			if (scrapeBuffers[userID].length > 1000) {
				corpusUtils.append(userID, scrapeBuffers[userID])
					.then(scrapeBuffers[userID] = "")
			}
		}

		// Sometimes the last message is just undefined. No idea why.
		let lastMessages = messages.last()
		let toLast = 2
		while (!lastMessages[0]) {
			lastMessages = messages.last(toLast) // Second-to-last message (or third-to-last, etc.)
			toLast++
		}

		const lastMessage = lastMessages[0]

		// Sometimes the actual message is in "message[1]", instead "message". No idea why.
		fetchOptions.before = (Array.isArray(lastMessage))
			? lastMessage[1].id
			: lastMessage.id

		if (messages.size >= 100 && messagesAdded < goal) // Next request won't be empty and goal is not yet met
			_getBatchOfMessages(fetchOptions)

		for (let message of messages) {
			if (messagesAdded >= goal) break
			if (Array.isArray(message)) message = message[1] // In case message is actually in message[1]
			if (message.content) { // Make sure that it's not undefined
				const authorID = message.author.id
				scrapeBuffers[authorID] += message.content + "\n"
				messagesAdded++

				if (!corpusUtils.unsaved.includes(authorID))
					corpusUtils.unsaved.push(authorID)

				if (!corpusUtils.local.includes(authorID))
					corpusUtils.local.push(authorID)
			}
		}
		activeLoops--
	}
	_getBatchOfMessages(fetchOptions)

	const whenDone = setInterval( () => {
		if (activeLoops === 0) {
			clearInterval(whenDone)
			for (const userID in scrapeBuffers) {
				corpusUtils.append(userID, scrapeBuffers[userID])
			}
			resolve(messagesAdded)
		}
	}, 100)
}


/**
 * Parses a message whose content is presumed to be a command
 *   and performs the corresponding action.
 * 
 * @param {Message} messageObj - Discord message to be parsed
 * @return {Promise<string>} Resolve: name of command performed; Reject: error
 */
async function handleCommand(message) {
	log.command(message)

	const args = message.content.slice(config.PREFIX.length).split(/ +/)
	const command = args.shift().toLowerCase()

	const admin = isAdmin(message.author.id)
	switch (command) {
		case "help":
			const embed = new Discord.RichEmbed()
				.setColor(config.EMBED_COLORS.normal)
				.setTitle("Help")
			
			// Individual command
			if (help.hasOwnProperty(args[0])) {
				if (help[args[0]].admin && !admin) { // Command is admin only and user is not an admin
					message.author.send(embeds.error("Don't ask questions you aren't prepared to handle the asnwers to."))
						.then(log.error)
					break
				} else {
					embed.addField(args[0], help[args[0]].desc + "\n" + help[args[0]].syntax)
				}
			// All commands
			} else {
				for (const [command, properties] of Object.entries(help)) {
					if (!(properties.admin && !admin)) // If the user is not an admin, do not show admin-only commands
						embed.addField(command, properties.desc + "\n" + properties.syntax)
				}
			}
			message.author.send(embed) // DM the user the help embed instead of putting it in chat since it's kinda big
				.then(log.help)
			break


		case "scrape":
			if (!admin) {
				message.channel.send(embeds.error("You aren't allowed to use this command."))
					.then(log.error)
				break
			}
			const channel = (args[0].toLowerCase() === "here")
				? message.channel
				: client.channels.get(args[0])

			if (!channel) {
				message.channel.send(embeds.error(`Channel not accessible: ${args[0]}`))
					.then(log.error)
				break
			}

			const howManyMessages = (args[1].toLowerCase() === "all")
				? "Infinity" // lol
				: parseInt(args[1])
		
			if (isNaN(howManyMessages)) {
				message.channel.send(embeds.error(`Not a number: ${args[1]}`))
					.then(log.error)
				break
			}

			// Resolve a starting message and a promise for an ending message
			message.channel.send(embeds.standard(`Scraping ${howManyMessages} messages from [${channel.guild.name} - #${channel.name}]...`))
				.then(log.say)


			scrape(channel, howManyMessages)
				.then(messagesAdded => {
					message.channel.send(embeds.standard(`Added ${messagesAdded} messages.`))
						.then(log.say)
				})
				.catch(err => {
					logError(err)
					message.channel.send(embeds.error(err))
						.then(log.error)
				})
			break

		case "imitate":
			let userID = args[0]

			if (args[0]) {
				// If args[0] is "me", use the sender's ID.
				// Otherwise, if it is a number, use it as an ID.
				// If it can't be a number, maybe it's a <@ping>. Try to convert it.
				// If it's not actually a ping, use a random ID.
				if (args[0].toLowerCase() === "me") {
					userID = message.author.id
				} else {
					if (isNaN(args[0]))
						userID = mentionToUserID(args[0]) || await randomUserID()
				}
			} else {
				userID = await randomUserID()
			}

			// Schism can't imitate herself
			if (userID === client.user.id) {
				message.channel.send(embeds.xok)
					.then(log.xok)
				break
			}

			imitate(userID, message.channel)
			break

		case "embed":
			if (!admin || !args[0]) break
			message.channel.send(embeds.standard(args.join(" ")))
				.then(log.say)
			break

		case "error":
			if (!admin || !args[0]) break
			message.channel.send(embeds.error(args.join(" ")))
				.then(log.error)
			break

		case "xok":
			if (!admin) break
			message.channel.send(embeds.xok)
				.then(log.xok)
			break

		case "save":
			if (!admin) break
			if (corpusUtils.unsaved.length === 0) {
				message.channel.send(embeds.error("Nothing to save."))
					.then(log.error)
				break
			}
			message.channel.send(embeds.standard("Saving..."))
			const savedCount = await corpusUtils.saveAll()
			message.channel.send(embeds.standard(log.save(savedCount)))
				.then(log.say)
			break

		/*case "filter":
		case "cleanse":
			if (!admin) break

			const userIDs = (args.length > 0)
				? args
				: corpusUtils.local

			const found = await filterUndefineds(userIDs)

			if (found.length > 0) {
				userTable(found).then(table => {
					console.info("Users filtered:")
					console.table(table)
				})
				.catch(console.warn)
			}

			message.channel.send(embeds.standard(`Found and removed the word "undefined" from the beginnings of ${found.length} corpi. See the logs for a list of affected users (unless you disabled logs; then you just don't get to know).`))
				.then(log.say)
			break*/
	}
	return command
}


/**
 * Sets the custom nicknames from the config file
 * 
 * @return {Promise<void>} Resolve: nothing (there were no errors); Reject: array of errors
 */
async function updateNicknames(nicknameDict) {
	const errors = []

	for (const serverName in nicknameDict) {
		const [ serverID, nickname ] = nicknameDict[serverName]
		const server = client.guilds.get(serverID)
		if (!server) {
			console.warn(`Nickname configured for a server that Schism is not in. Nickname could not be set in ${serverName} (${serverID}).`)
			continue
		}
		server.me.setNickname(nickname)
			.catch(errors.push)
	}

	if (errors.length > 0)
		throw errors
	else
		return
}


/**
 * 0.05% chance to return true; 99.95% chance to return false.
 * 
 * @return {Boolean} True/false
 */
function blurtChance() {
	return Math.random() * 100 <= 0.05 // 0.05% chance
}


/**
 * Get status name from status code
 * 
 * @param {number} code - status code
 * @return {string} status name
 */
function status(code) {
	return ["Playing", "Streaming", "Listening", "Watching"][code]
}


/**
 * TODO: make this not comically unreadable
 * 
 * @param {string} mention - a string like "<@1234567891234567>"
 * @return {string} user ID
 */
function mentionToUserID(mention) {
	return (mention.startsWith("<@") && mention.endsWith(">"))
		? mention.slice(
			(mention.charAt(2) === "!")
				? 3
				: 2
			, -1
		)
		: null
}


/**
 * Is [val] in [obj]?
 * 
 * @param {any} val
 * @param {Object} object
 * @return {Boolean} True/false
 */
function has(val, obj) {
	for (const i in obj) {
		if (obj[i] === val)
			return true
	}
	return false
}


function isAdmin(userID) {
	return has(userID, config.ADMINS)
}


function isBanned(userID) {
	return has(userID, config.BANNED)
}


function isHook(userID) {
	for (const key in config.HOOKS) {
		if (config.HOOKS[key].hookID === userID)
			return true
	}
	return false
}


function canSpeakIn(channelID) {
	return has(channelID, config.SPEAKING_CHANNELS)
}


function learningIn(channelID) {
	return has(channelID, config.LEARNING_CHANNELS)
}


/**
 * DMs the admins and logs an error
 * 
 * @param {string} err - an error
 */
function logError(err) {
	console.error(err)
	const sendThis = (err.message)
		? `ERROR! ${err.message}`
		: `ERROR! ${err}`

	for (const key in config.ADMINS) {
		const userId = config.ADMINS[key]
		client.fetchUser(userId)
			.then(user => user.send(sendThis))
			.catch(console.error)
	}
}


function httpsDownload(url) {
	return new Promise( (resolve, reject) => {
		require("https").get(url, res => {
			if (res.statusCode === 200) {
				let rawData = ""
				res.setEncoding("utf8")
				res.on("data", chunk => rawData += chunk)
				res.on("end", () => resolve(rawData))
			} else {
				reject(`Failed to download URL: ${url}`)
			}
		})
	})
}


/**
 * Remove bad words from a phrase
 * 
 * @param {string} phrase - Input string
 * @return {Promise<string|Error>} Resolve: filtered string; Reject: Error
 */
async function cleanse(phrase) {
	if (!config.BAD_WORDS) return phrase

	let words = phrase.split(" ")
	words = words.filter(word => {
		word = word.toLowerCase().replace("\n", "")
		return !config.BAD_WORDS.includes(word)
	})

	return words.join(" ")
}


/**
 * Turns this:
 *     "server - #channel": {
 *         "channelID": "876587263845753",
 *         "hookID": "1254318729468795",
 *         "token": 9397013nv87y13iuyfn.88FJSI77489n.hIDSeHGH353"
 *     },
 *     "other server - #channeln't": {
 *         . . .
 *     }
 * 
 * Into this:
 *     "876587263845753": [DiscordWebhookClient],
 *     "other channelid": [DiscordWebhookClient]
 * 
 * @param {Object} hooksDict - object to be parsed
 * @return {Object} parsed object
 */
function parseHooksDict(hooksDict) {
	if (!hooksDict) return null
	const hooks = {}
	for (const key in hooksDict) {
		const { channelID, hookID, token } = hooksDict[key]
		const hook = new Discord.WebhookClient(hookID, token)
		hooks[channelID] = hook
	}
	return hooks
}


/**
 * Parses <@6813218746128746>-type strings into @user#1234-type strings.
 * This makes it so that the string won't actually ping any users.
 * 
 * @param {string} sentence - sentence to disable pings in
 * @return {string} sentence that won't ping anyone
 */
async function disablePings(sentence) {
	const words = sentence.split(" ")
	for (let i=0; i<words.length; i++) {
		const userID = mentionToUserID(words[i])
		if (userID) {
			const user = await client.fetchUser(userID)
			words[i] = "@" + user.tag
		}
	}
	return words.join(" ")
}

	
/**
 * Generate an object containing stats about
 *   all the channels in the given dictionary.
 * 
 * @param {Object} channelDict - Dictionary of channels
 * @return {Promise<Object|Error>} Resolve: Object intended to be console.table'd; Reject: error
 * 
 * @example
 *     channelTable(config.SPEAKING_CHANNELS)
 *         .then(console.table)
 */
async function channelTable(channelDict) {
	if (config.DISABLE_LOGS) return {}
	
	if (isEmpty(channelDict))
		throw "No channels are whitelisted."

	const stats = {}
	for (const i in channelDict) {
		const channelID = channelDict[i]
		const channel = client.channels.get(channelID)

		if (!channel) {
			logError(`channelTable() non-fatal error: could not find a channel with the ID ${channelID}`)
			continue
		}

		const stat = {}
		stat["Server"] = channel.guild.name
		stat["Name"] = "#" + channel.name
		stats[channelID] = stat
	}
	return stats
}


/**
 * Generate an object containing stats about
 *   all the nicknames Schism has.
 * 
 * @param {Object} nicknameDict - Dictionary of nicknames
 * @return {Promise<Object|Error>} Resolve: Object intended to be console.table'd; Reject: error
 * 
 * @example
 *     nicknameTable(config.NICKNAMES)
 *         .then(console.table)
 */
async function nicknameTable(nicknameDict) {
	if (config.DISABLE_LOGS) return {}
	
	if (isEmpty(nicknameDict))
		throw "No nicknames defined."

	const stats = {}
	for (const serverName in nicknameDict) {
		const [ serverID, nickname ] = nicknameDict[serverName]
		const server = client.guilds.get(serverID)

		if (!server) {
			logError(`nicknameTable() non-fatal error: could not find a server with the ID ${serverID}`)
			continue
		}

		const stat = {}
		stat["Server"] = server.name
		stat["Intended"] = nickname
		stat["De facto"] = server.me.nickname
		stats[serverID] = stat
	}
	return stats
}


/**
 * Generate an object containing stats about
 *   the supplied array of user IDs.
 * 
 * @param {string[]} userIDs - Array of user IDs
 * @return {Promise<Object|Error>} Resolve: Object intended to be console.table'd; Reject: error
 * 
 * @example
 *     userTable(["2547230987459237549", "0972847639849352398"])
 *         .then(console.table)
 */
async function userTable(userIDs) {
	if (config.DISABLE_LOGS) return {}
	
	if (!userIDs || userIDs.length === 0)
		throw "No user IDs defined."

	// If userIDs a single value, wrap it in an array
	if (!Array.isArray(userIDs)) userIDs = [userIDs]

	const stats = {}
	for (const userID of userIDs) {
		const user = await client.fetchUser(userID)

		if (!user) {
			logError(`userTable() non-fatal error: could not find a user with the ID ${userID}`)
			continue
		}

		const stat = {}
		stat["Username"] = user.tag
		stats[userID] = stat
	}
	return stats
}


/**
 * Utility function that produces a string containing the
 *   place the message came from.
 * 
 * @param {Message} message - message object, like from channel.send() or on-message
 * @return {string} "[Server - #channel]" format string
 */
function location(message) {
	if (message.hasOwnProperty("channel")) {
		const type = message.channel.type
		if (type === "text") {
			return `[${message.guild.name} - #${message.channel.name}]`
		} else if (type === "dm") {
			return `[Direct message]`
		} else {
			return `[Unknown: ${type}]`
		}
	} else {
		const channel = client.channels.get(message.channel_id)
		return `[${channel.guild.name} - #${channel.name}]`
	}
}


/**
 * Is [obj] empty?
 * 
 * @param {Object} obj
 * @return {Boolean} empty or not
 */
function isEmpty(obj) {
	for (const key in obj) {
		if (obj.hasOwnProperty(key))
			return false
	}
	return true
}


// --- /FUNCTIONS -------------------------------------------
