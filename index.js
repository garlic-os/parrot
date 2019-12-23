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

// (Hopefully) save and clear cache before shutting down
process.on("SIGTERM", () => {
	console.info("Saving changes...")
	saveCache()
		.then(savedCount => console.info(log.save(savedCount)))
})

// Requirements
const fs      = require("fs"),
	  path    = require("path"),
      Discord = require("discord.js"),
      AWS     = require("aws-sdk"),
	  markov  = require("./markov"),
      embeds  = require("./embeds")(config.EMBED_COLORS),
	  help    = require("./help")

// Configure AWS-SDK to access an S3 bucket
AWS.config.update({
	accessKeyId: config.AWS_ACCESS_KEY_ID,
	secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
	region: config.AWS_REGION
})
const s3 = new AWS.S3()

// Array of promises
// Do all these things before logging in
const init = []

// Local directories have to exist before they can be accessed
init.push(ensureDirectory("./cache"))

// Cache a list of user IDs to cut down on S3 requests
const userIdCache = []
init.push(s3listUserIds().then(userIds => {
	for (const userId of userIds) {
		userIdCache.push(userId)
	}
}))

// Set BAD_WORDS if BAD_WORDS_URL is defined
if (config.BAD_WORDS_URL) {
	init.push(httpsDownload(config.BAD_WORDS_URL)
		.then(rawData => config.BAD_WORDS = rawData.split("\n")))
}

// Reusable log messages
const log = {
	  say:     message => console.log(`${location(message)} Said: ${message.content}`)
	, embed:   message => console.log(`${location(message)} Said: ${message.embeds[0].fields[0].value}`)
	, imitate: message => console.log(`${location(message)} Imitated ${message.embeds[0].fields[0].name}, saying: ${message.embeds[0].fields[0].value}`)
	, error:   message => console.log(`${location(message)} Sent the error message: ${message.embeds[0].fields[0].value}`)
	, xok:     message => console.log(`${location(message)} Send the XOK message`)
	, help:    message => console.log(`${location(message)} Sent the Help message`)
	, save:    count   => `Saved ${count} ${(count === 1) ? "corpus" : "corpi"}.`
}

const buffers = {},
      unsavedCache = []

const client = new Discord.Client()

// --- LISTENERS ---------------------------------------------

client.on("ready", () => {
	console.info(`Logged in as ${client.user.tag}.\n`)
	updateNicknames(config.NICKNAMES)

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
	.catch(console.warn)

})


client.on("message", async message => {
	const authorId = message.author.id

	if (!isBanned(authorId) // Not banned from using Bipolar
	   && (canSpeakIn(message.channel.id) // Channel is either whitelisted or is a DM channel
		  || message.channel.type === "dm")
	   && message.author.id !== client.user.id) { // Not self

		// Ping
		if (message.isMentioned(client.user)
		   && !message.author.bot // Not a bot
		   && !message.content.includes(" ")) { // Message has no spaces (i.e. contains nothing but a ping)
			console.log(`${location(message)} Pinged by ${message.author.tag}.`)
			const userId = randomUserId()
			imitate(userId, message.channel)
		}

		// Command
		else if (message.content.startsWith(config.PREFIX)) {
			handleCommands(message)
		}
		
		// Nothing special
		else {
			// Maybe imitate someone anyway
			if (blurtChance()) {
				console.log(`${location(message)} Randomly decided to imitate someone in response to ${message.author.tag}'s message.`)
				const userId = randomUserId()
				imitate(userId, message.channel)
			}

			if (learningIn(message.channel.id)
				&& message.content.length > 0) {
				/**
				 * Learn
				 * 
				 * Record the message to the user's corpus
				 * Builds up messages from that user until they have
				 *   been silent for at least five seconds,
				 * then writes them all to cache in one fell swoop.
				 * Messages will be saved for good come the next autosave.
				 */
				if (buffers.hasOwnProperty(authorId) && buffers[authorId].length > 0) {
					buffers[authorId] += message.content + "\n"

				} else {
					buffers[authorId] = message.content + "\n"
					setTimeout( async () => {
						const buffer = await cleanse(buffers[authorId])
						if (buffer.length === 0) return

						await appendCorpus(authorId, buffer)
						if (!unsavedCache.includes(authorId))
							unsavedCache.push(authorId)

						if (!userIdCache.includes(authorId))
							userIdCache.push(authorId)

						console.log(`${location(message)} Learned from ${message.author.tag}:`, buffer)
						buffers[authorId] = ""
					}, 5000) // Five seconds
				}
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
		const savedCount = await saveCache()
		console.info(log.save(savedCount))
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
 * Generates a sentence based off [userId]'s corpus
 * 
 * @param {string} userId - ID corresponding to a user to generate a sentence from
 * @return {Promise<string|Error>} Resolve: sentence; Reject: error loading user's corpus
 */
async function generateSentence(userId) {
	const corpus = await loadCorpus(userId)
	const wordCount = ~~(Math.random() * 49 + 1) // 1-50 words
	const coherence = (Math.random() > 0.5) ? 2 : 6 // State size 2 or 6
	let sentence = await markov(corpus, wordCount, coherence)
	sentence = sentence.substring(0, 1024) // Hard cap of 1024 characters (embed field limit)
	if (!sentence || sentence.length === 0) {
		logError("A sentence was 0 characters long. That is not supposed to happen.")
	}
	return sentence
}


async function imitate(userId, channel) {
	const sentence = await generateSentence(userId)
	try {
		const embed = await embeds.imitate(userId, sentence, channel)
		channel.send(embed)
			.then(log.imitate)
	} catch (err) {
		channel.send(embeds.error(err))
			.then(log.error)
	}
}


function randomUserId() {
	const index = ~~(Math.random() * userIdCache.length - 1)
	return userIdCache[index]
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
		for (const userId in scrapeBuffers) {
			if (scrapeBuffers[userId].length > 1000) {
				appendCorpus(userId, scrapeBuffers[userId])
				scrapeBuffers[userId] = ""
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
				const authorId = message.author.id
				scrapeBuffers[authorId] += message.content + "\n"
				messagesAdded++

				if (!unsavedCache.includes(authorId))
					unsavedCache.push(authorId)

				if (!userIdCache.includes(authorId))
					userIdCache.push(authorId)
			}
		}
		activeLoops--
	}
	_getBatchOfMessages(fetchOptions)

	const whenDone = setInterval( () => {
		if (activeLoops === 0) {
			clearInterval(whenDone)
			for (const userId in scrapeBuffers) {
				appendCorpus(userId, scrapeBuffers[userId])
			}
			resolve(messagesAdded)
		}
	}, 100)
}


/**
 * Remove "undefined" from the beginning of any given corpus that has it.
 * 
 * @param {Array} userIds - array of user IDs to sort through
 * @return {Promise<Array>} this never rejects lol. Resolve: array of user IDs where an "undefined" was removed
 */
async function filterUndefineds(userIds) {
	async function filter(userId) {
		let corpus
		let inCache = false
		try {
			corpus = await cacheRead(userId)
			inCache = true
		} catch (e) {
			corpus = await s3read(userId)
		}

		console.debug('[*] corpus preview:', corpus.substring(0, 25))

		if (corpus.startsWith("undefined")) {
			corpus = corpus.substring(9) // Remove the first nine characters (which is "undefined")

			(inCache)
				? cacheWrite(userId, corpus)
				: s3Write(userId, corpus)

			return userId
		}
	}

	const found = []
	const promises = []
	for (const userId of userIds) {
		promises.push(
			filter(userId).then(userId => {
				if (userId) found.push(userId)
			})
		)
	}
	console.debug('[*]', promises.length)
	await Promise.all(promises)
	return found
}


/**
 * Parses a message whose content is presumed to be a command
 *   and performs the corresponding action.
 * 
 * Here be dragons.
 * 
 * @param {Message} messageObj - Discord message to be parsed
 * @return {Promise<string>} Resolve: name of command performed; Reject: error
 */
async function handleCommands(message) {
	if (message.author.bot) return resolve(null)

	console.log(`${location(message)} Received a command from ${message.author.tag}: ${message.content}`)

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
				.then(log.embed)
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
				.then(log.embed)


			scrape(channel, howManyMessages)
				.then(messagesAdded => {
					message.channel.send(embeds.standard(`Added ${messagesAdded} messages.`))
						.then(log.embed)
				})
				.catch(err => {
					message.channel.send(embeds.error(err))
						.then(log.error)
				})
			break

		case "imitate":
			let userId = args[0]

			if (args[0]) {
				// If args[0] is "me", use the sender's ID.
				// Otherwise, if it is a number, use it as an ID.
				// If it can't be a number, maybe it's a <@ping>. Try to convert it.
				// If it's not actually a ping, use a random ID.
				if (args[0].toLowerCase() === "me") {
					userId = message.author.id
				} else {
					if (isNaN(args[0]))
						userId = mentionToUserId(args[0]) || randomUserId()
				}
			} else {
				userId = randomUserId()
			}

			// Bipolar can't imitate herself
			if (userId === client.user.id) {
				message.channel.send(embeds.xok)
					.then(log.xok)
				break
			}

			imitate(userId, message.channel)
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
			if (unsavedCache.length === 0) {
				message.channel.send(embeds.error("Nothing to save."))
					.then(log.error)
				break
			}
			message.channel.send(embeds.standard("Saving..."))
			const savedCount = await saveCache()
			message.channel.send(embeds.standard(log.save(savedCount)))
				.then(log.say)
			break

		/*case "filter":
		case "cleanse":
			if (!admin) break

			const userIds = (args.length > 0)
				? args
				: userIdCache

			const found = await filterUndefineds(userIds)

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
 * @return {Promise<void>} Resolve: nothing (there were no errors); Reject: nothing (there was an error)
 */
async function updateNicknames(nicknameDict) {
	const errors = []

	for (const serverName in nicknameDict) {
		const [ serverId, nickname ] = nicknameDict[serverName]
		const server = client.guilds.get(serverId)
		if (!server) {
			console.warn(`Nickname configured for a server that Bipolar is not in. Nickname could not be set in ${serverName} (${serverId}).`)
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
 * Downloads a file from S3_BUCKET_NAME.
 * 
 * @param {string} userId - ID of corpus to download from the S3 bucket
 * @return {Promise<Buffer|Error>} Resolve: Buffer from bucket; Reject: error
 */
function s3read(userId) {
	return new Promise( (resolve, reject) => {
		const params = {
			Bucket: process.env.S3_BUCKET_NAME, 
			Key: `${config.CORPUS_DIR}/${userId}.txt`
		}
		s3.getObject(params, (err, data) => {
			if (err) return reject(err)

			if (data.Body === undefined || data.Body === null)
				return reject(`Empty response at path: ${path}`)

			resolve(data.Body.toString()) // Convert Buffer to string
		})
	})
}


/**
 * Uploads (and overwrites) a corpus in S3_BUCKET_NAME.
 * 
 * @param {string} userId - user ID's corpus to upload/overwrite
 * @return {Promise<Object|Error>} Resolve: success response; Reject: Error
 */
function s3write(userId, data) {
	return new Promise( (resolve, reject) => {
		const params = {
			Bucket: process.env.S3_BUCKET_NAME,
			Key: `${config.CORPUS_DIR}/${userId}.txt`,
			Body: Buffer.from(data, "UTF-8")
		}
		s3.upload(params, (err, res) => {
			(err) ? reject(err) : resolve(res)
		})
	})
}


/**
 * Compiles a list of all the IDs inside 
 */
function s3listUserIds() {
	return new Promise( (resolve, reject) => {
		const params = {
			Bucket: process.env.S3_BUCKET_NAME,
			Prefix: config.CORPUS_DIR,
		}
		s3.listObjectsV2(params, (err, res) => {
			if (err) return reject(err)
			const userIds = res.Contents.map( ({ Key }) => {
				// Remove file extension and preceding path
				return path.basename(Key.replace(/\.[^/.]+$/, ""))
			})
			resolve(userIds)
		})
	})
}


/**
 * Uploads all unsaved cache to S3
 *   and empties the list of unsaved files.
 * 
 * @return {Promise<void|Error>} Resolve: number of files saved; Reject: s3write() error
 */
async function saveCache() {
	let savedCount = 0
	const promises = []
	while (unsavedCache.length > 0) {
		const userId = unsavedCache.pop()
		const corpus = await loadCorpus(userId)
		promises.push(
			s3write(userId, corpus)
				.then(savedCount++)
		)
	}

	await Promise.all(promises)
	return savedCount
}


/**
 * Make directory if it doesn't exist
 *
 * @param {string} dir - Directory of which to ensure existence
 * @return {Promise<string|Error>} Directory if it already exists or was successfully made; error if something goes wrong
 */
function ensureDirectory(dir) {
	return new Promise( (resolve, reject) => {
		fs.stat(dir, err => {
			if (err && err.code === "ENOENT") {
				fs.mkdir(dir, { recursive: true }, err => {
					(err) ? reject(err) : resolve(dir)
				})
			}
			else (err) ? reject(err) : resolve(dir)
		})
	})
}


/**
 * Try to load the corpus corresponding to [userId] from cache.
 * If the corpus isn't in cache, try to download it from S3.
 * If it isn't there either, give up.
 * 
 * @param {string} userId - user ID whose corpus to load
 * @return {Promise<corpus|Error>} Resolve: [userId]'s corpus; Reject: Error
 */
async function loadCorpus(userId) {
	try {
		return await cacheRead(userId) // Maybe the user's corpus is in cache
	} catch (err) {
		if (err.code !== "ENOENT") // Only proceed if the reason cacheRead() failed was
			throw err              //   because it couldn't find the file

		// Maybe the user's corpus is in the S3 bucket
		// If not, the user is nowhere to be found (or something went wrong)
		const corpus = await s3read(userId)
		cacheWrite(userId, corpus)
		return corpus
	}
}


/**
 * Add data to a user's corpus.
 * 
 * @param {string} userId - ID of the user whose corpus to add data to
 * @param {string} data - data to add
 * @return {Promise<void|Error} Resolve: nothing; Reject: Error
 */
function appendCorpus(userId, data) {
	return new Promise( (resolve, reject) => {
		if (fs.readdirSync(`./cache`).includes(`${userId}.txt`)) { // Corpus is in cache
			fs.appendFile(`./cache/${userId}.txt`, data, err => { // Append the new data to it
				if (err) reject(err)
			})
		} else if (userIdCache.includes(userId)) {
			// Download the corpus from S3, add the new data to it, then cache it
			s3read(userId).then(corpus => {
				corpus += data
				cacheWrite(userId, corpus)
				resolve(corpus)
			})
		} else {
			// User doesn't exist; make them a new corpus from just the new data
			cacheWrite(userId, data)
			resolve(data)
		}
	})
}


/**
 * Writes a file to cache.
 * 
 * @param {string} filename - name of file to write to (minus extension)
 * @param {string} data - data to write
 * @return {Promise<void|Error>} Resolve: nothing; Reject: Error
 */
function cacheWrite(filename, data) {
	return new Promise( (resolve, reject) => {
		fs.writeFile(`./cache/${filename}.txt`, data, err => {
			(err) ? reject(err) : resolve()
		})
	})
}


/**
 * Reads a file from cache.
 * 
 * @param {string} filename - name of file to read (minus extension)
 * @return {Promise<string|Error>} Resolve: file's contents; Reject: Error
 */
function cacheRead(filename) {
	return new Promise( (resolve, reject) => {
		fs.readFile(`./cache/${filename}.txt`, "UTF-8", (err, data) => {
			if (err) return reject(err)
			if (data === "") return reject( { code: "ENOENT" } )
			resolve(data)
		})
	})
}


/**
 * 0.05% chance to return true; else false
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
function mentionToUserId(mention) {
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


function isAdmin(userId) {
	return has(userId, config.ADMINS)
}


function isBanned(userId) {
	return has(userId, config.BANNED)
}


function canSpeakIn(channelId) {
	return has(channelId, config.SPEAKING_CHANNELS)
}


function learningIn(channelId) {
	return has(channelId, config.LEARNING_CHANNELS)
}


/**
 * Is Object [obj] empty?
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


/**
 * Shortcut to a reusable message location string
 * 
 * @param {Message} message
 * @return {string} - "[Server - #channel]" format string
 */
function location(message) {
	return (message.channel.type == "dm")
		? `[Direct message]`
		: `[${message.guild.name} - #${message.channel.name}]`
}


/**
 * Generates an object containing stats about
 *   all the channels in the given dictionary.
 * 
 * @param {Object} channelDict - Dictionary of channels
 * @return {Promise<Object|Error>} Resolve: Object intended to be console.table'd; Reject: "empty object
 * 
 * @example
 *     channelTable(config.SPEAKING_CHANNELS)
 *         .then(console.table)
 */
async function channelTable(channelDict) {
	if (config.DISABLE_LOGS)
		return {}
	
	if (isEmpty(channelDict))
		throw "No channels are whitelisted."

	const stats = {}
	for (const i in channelDict) {
		const channelId = channelDict[i]
		const channel = client.channels.get(channelId)
		const stat = {}
		stat["Server"] = channel.guild.name
		stat["Name"] = "#" + channel.name
		stats[channelId] = stat
	}
	return stats
}


/**
 * Generates an object containing stats about
 *   all the nicknames Bipolar has.
 * 
 * @param {Object} nicknameDict - Dictionary of nicknames
 * @return {Promise<Object|Error>} Resolve: Object intended to be console.table'd; Reject: "empty object"
 * 
 * @example
 *     nicknameTable(config.NICKNAMES)
 *         .then(console.table)
 */
async function nicknameTable(nicknameDict) {
	if (config.DISABLE_LOGS)
		return {}
	
	if (isEmpty(nicknameDict))
		throw "No nicknames defined."

	const stats = {}
	for (const serverName in nicknameDict) {
		const [ serverId, nickname ] = nicknameDict[serverName]
		const server = client.guilds.get(serverId)
		const stat = {}
		stat["Server"] = server.name
		stat["Intended"] = nickname
		stat["De facto"] = server.me.nickname
		stats[serverId] = stat
	}
	return stats
}


async function userTable(userIds) {
	if (config.DISABLE_LOGS)
		return {}
	
	if (!userIds || userIds.length === 0)
		throw "No user IDs defined."

	// If userIds a single value, wrap it in an array
	if (!Array.isArray(userIds)) userIds = [userIds]

	const stats = {}
	for (const userId of userIds) {
		const user = await client.fetchUser(userId)
		const stat = {}
		stat["Username"] = user.tag
		stats[userId] = stat
	}
	return stats
}


/**
 * DM's garlicOS and logs error
 */
function logError(err) {
	console.error(err)
	const sendThis = (err.message)
		? `ERROR! ${err.message}`
		: `ERROR! ${err}`

	// Yes, I hardcoded my own user ID. I'm sorry.
	client.fetchUser("206235904644349953")
		.then(me => me.send(sendThis))
		.catch(console.error)
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


// --- /FUNCTIONS -------------------------------------------
