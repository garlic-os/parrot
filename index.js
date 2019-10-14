// Permissions code: 67584
// Send messages, read message history


// Crash when a reject() doesn't have a .catch(); useful for debugging
process.on("unhandledRejection", up => { throw up })

const local = process.env.LOCAL != "0" && process.env.LOCAL != "false"

// Requirements
require("console-stamp")(console, {
	datePrefix: "",
	dateSuffix: "",
	pattern: " "
})

// Requirements
const Markov = require("./markov"), // Local markov.js file
      Discord = require("discord.js"),
      fs = require("fs"),
      AWS = require("aws-sdk")

// Configure AWS-SDK to access an S3 bucket
AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
const s3 = new AWS.S3()

const init = []

// Load config
init.push(read(process.env.CONFIG_PATH).then(data => {
	global.config = JSON.parse(data)

	// Local directories have to exist before they can be accessed
	if (local) {
		init.push(ensureDirectory(config.corpusDir)
			.catch(err => { throw err }))
		
	}

	// Markov setup 
	console.info("Loading corpi and spawning Markovs...")
	global.corpi = new Map() // plural of corpus is corpi dont @ me
	global.markovs = new Map()

	init.push(loadAllCorpi().then( () => {
		console.info("Corpi are loaded.")
		regenerateAll()
			.then(console.info("Markovs are ready."))
			.catch(err => { throw err })
	})
	.catch(err => { throw err }))

	// "Help" command
	global.help = {
		scrape: {
			admin: true,
			desc: `Saves [howManyMessages] messages in [channel].`,
			syntax: `Syntax: ${config.prefix}scrape <channelID> <howManyMessages>`
		},
		imitate: {
			admin: false,
			desc: `Imitate a user.`,
			syntax: `Syntax: ${config.prefix}imitate <ping a user>`
		}
	}
}))

// Reusable log messages
const log = {
	say:      message  => console.log(`${location(message)} Said: ${message.content}`),
	imitate:  res      => console.log(`[${res.channel.guild.name} - #${res.channel.name}] Imitated ${res.user.tag}, saying: ${res.str}`),
	presence: presence => console.log(`Set ${config.name}'s activity: ${statusCode(presence.game.type)} ${presence.game.name}`),
	help:     message  => console.log(`${location(message)} Sent the Help box`)
}

const lastMessageIds = new Map()
const buffers = new Map()

const client = new Discord.Client()


// --- LISTENERS ---------------------------------------------

client.on("ready", () => {
	console.info(`Logged in as ${client.user.tag}.\n`)
	updateNicknames()

	// "Watching everyone"
	client.user.setActivity(`everyone (${config.prefix}help)`, { type: "WATCHING" })
		.then(log.presence)
		.catch(logError)
	
	channelTable().then(table => {
		console.info("Channels:")
		console.table(table)
	})
	.catch(console.warn)

	nicknameTable().then(table => {
		console.info("Nicknames:")
		console.table(table)
	})
	.catch(console.info)

})


client.on("message", message => {
	const authorId = message.author.id

	if ((!isBanned(authorId)) // Not banned from using Bipolar
		&& (channelWhitelisted(message.channel.id)) || // Channel is either whitelisted or is a DM channel
			(message.channel.type == "dm")) {

		// Ping
		if (message.isMentioned(client.user) && !message.author.bot) {
			console.log(`${location(message)} Pinged by ${message.author.tag}.`)
			if (message.content.split(" ").length === 1) { // Message is one word (i.e. only the ping)
				imitateRandom(message.channel)
					.then(log.imitate)
					.catch(logError)
			}
		}

		// Command
		else if (message.content.startsWith(config.prefix)) {
			handleCommands(message)
				.catch(logError)
		}
		
		// If the message is nothing special, maybe imitate someone anyway
		else if (blurtChance()) {
			console.log(`${location(message)} Randomly decided to imitate someone in response to ${message.author.tag}'s message.`)
			imitateRandom(message.channel)
				.then(log.imitate)
				.catch(logError)
		}


		// Only take the time and processing power to regenerate
		//   if the user hasn't spoken for a little bit,
		//   instead of regenerating for _every_ message.
		// Saves Bipolar from being bogged down by spam.
		lastMessageIds.set(authorId, message.id)
		if (!buffers.has(authorId)) buffers.set(authorId, "")
		if (!corpi.has(authorId)) corpi.set(authorId, "")
		// Build up new messages in a buffer to reduce accesses to the huge corpus variables
		buffers.set(authorId, buffers.get(authorId) + message.content + "\n")

		// After 5 seconds of no activity from a user, save their corpus and regenerate their Markov
		setTimeout( () => {
			if (lastMessageIds.get(authorId) === message.id) { // Message from this user is the same one from 5 seconds ago
				corpi.set(authorId, corpi.get(authorId) + buffers.get(authorId))
				buffers.set(authorId, "")
				write(`${config.corpusDir}/${authorId}.txt`, corpi.get(authorId))
					.then( () => {
						console.log(`Saved ${message.author.tag}'s corpus.`)
						regenerate(authorId)
							.then(console.log(`Regenerated ${message.author.tag}'s Markov.`))
							.catch(logError)
					})
					.catch(logError)
			}
		}, 5000)
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

Promise.all([init]).then( () => {
	console.info("Logging in...")
	client.login(process.env.DISCORD_BOT_TOKEN)
})


// --- /LOGIN ------------------------------------------------

// --- FUNCTIONS ---------------------------------------------


/**
 * Loads the corpus corresponding to a user ID
 * 
 * @param {string} userId - user ID whose corpus to load
 * @return {Promise<void|Error>} Resolve: nothing; Reject: Error
 */
function loadCorpus(userId) {
	return new Promise( (resolve, reject) => {
		read(`${config.corpusDir}/${userId}.txt`).then(corpus => {
			corpi.set(userId, corpus)
			resolve()
		})
		.catch(reject)
	})
}


/**
 * Loads all the corpi in the corpus directory
 * 
 * @return {Promise<void|Error>} Resolve: nothing; Reject: Error
 */
function loadAllCorpi() {
	return new Promise( (resolve, reject) => {
		ls(config.corpusDir).then(userIds => {
			for (const userId of userIds) {
				loadCorpus(userId)
					.then(resolve)
					.catch(reject)
			}
		})

	})
}


/**
 * (Re)generates the Markov chain
 *   that corresponds to [userId]
 * 
 * @param {string} userId - regenerates this user's Markov chain
 * @return {Promise<void|Error} Resolve: void; Reject: Error
 */
function regenerate(userId) {
	return new Promise( (resolve, reject) => {
		const corpus = corpi.get(userId)

		try {
			markovs.set(userId, new Markov(corpus))
		} catch (err) {
			return reject(err)
		}

		resolve()
	})
}


/**
 * (Re)generates all Markov chains
 * 
 * @return {Promise<void|Error>} Resolve: void - everything regenerated successfully; Reject: Error - something failed
 */
function regenerateAll() {
	return new Promise( (resolve, reject) => {
		for (const userId of corpi.keys()) {
			regenerate(userId)
				.catch(reject)
		}
		resolve()
	})
}


/**
 * Generates a string from [user]'s Markov
 *   and sends it to [channel]
 * 
 * @param {User} user - User to generate a message from
 * @param {Channel} channel - Channel to send the message to
 * @return {Promise} Resolve: { user, message } object; Reject: .send's rejection 
 */
function imitate(user, channel) {
	return new Promise( (resolve, reject) => {
		const quote = markovs.get(user.id).generate().substring(0, quoteSize())
		if (quote && quote.length > 0) {

			const embed = new Discord.RichEmbed()
				.setColor(config.embedColor)
				.setThumbnail(user.displayAvatarURL)
				.addField(channel.members.get(user.id).displayName, quote)

			channel.send(embed).then( () => {
				resolve( { user: user, channel: channel, str: quote } )
			})
			.catch(reject)
		} else {
			reject("Quoten't")
		}
	})
}


/**
 * Forwards a randomly-picked user to imitate()
 * 
 * @param {Channel} channel - Channel to send the message to
 * @return {Promise} Resolution or rejection from imitate()
 */
function imitateRandom(channel) {
	return new Promise( (resolve, reject) => {
		const userId = randomKey(markovs)
		const user = client.users.get(userId)
		imitate(user, channel)
			.then(resolve)
			.catch(reject)

	})
}


function quoteSize() {
	return Math.floor(Math.random() * 337 + 5)
}


/**
 * Shortcut that adds a standard .then and .catch
 *   to message-sending commands
 * 
 * @param {Channel} channel - Discord channel to send the message to
 * @param {string} content - Content of message
 */
function say(channel, content) {
	channel.send(content)
		.then(log.say)
		.catch(logError)
}


/**
 * Scrape channel
 * Records each user's messages to [config.corpusDir]/[userId].txt
 *
 * @param {Channel} channel - what channel to scrape
 * @param {number} howManyMessages - number of messages to scan (a negative number will scan all messages)
 * @return {Promise<number|Error>} number of messages added
 */
function scrape(channel, howManyMessages) {
	return new Promise( (resolve, reject) => { try {
		const howManyRequests = Math.ceil(howManyMessages / 100)
		const fetchOptions = { limit: 100 /*, before: [last message from previous request]*/ }
		let activeLoops = 0
		let messagesAdded = 0

		function _loop(counter, fetchOptions) {
			activeLoops++
			channel.fetchMessages(fetchOptions).then(messages => {
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

				if (messages.size >= 100 && counter != 0) // Next request won't be empty
					_loop(counter-1, fetchOptions)

				for (let message of messages) {
					// In case message is actually in message[1]
					if (Array.isArray(message)) message = message[1]

					const userId = message.author.id
					corpi.set(userId, corpi.get(userId) + message.content + "\n")

					messagesAdded++
				}

				activeLoops--
			})
		}
		_loop(howManyRequests, fetchOptions)

		const whenDone = setInterval( () => {
			if (activeLoops === 0) {
				clearInterval(whenDone)
				resolve(messagesAdded)
			}
		}, 100)
	
	} catch (err) {
		reject(err)
	}})
}


/**
 * Parses a message whose content is presumed to be a command
 *   and performs the corresponding action
 * 
 * here be dragons
 * 
 * @param {Message} messageObj - Discord message to be parsed
 * @return {Promise<string>} Resolve: name of command performed; Reject: error
 */
function handleCommands(message) {
	return new Promise ( (resolve, reject) => {
		if (message.author.bot) return reject("Bots are not allowed to use commands")

		console.log(`${location(message)} Received a command from ${message.author.tag}: ${message.content}`)

		const args = message.content.slice(config.prefix.length).split(/ +/)
		const command = args.shift().toLowerCase()

		try {
			const admin = isAdmin(message.author.id)

			if (command === "help") {
				const embed = new Discord.RichEmbed()
					.setColor(config.embedColor)
					.setTitle("Help")
				
				if (help.hasOwnProperty(args[0])) {
					if (help[args[0]].admin && !admin) { // Command is admin only and user is not an admin
						return resolve(command) // Do nothing
					} else {
						embed.addField(args[0], help[args[0]].desc + "\n" + help[args[0]].syntax)
					}
				} else {
					for (const [command, properties] of Object.entries(help)) {
						if (!(properties.admin && !admin)) // If the user is not an admin, do not show admin-only commands
							embed.addField(command, properties.desc + "\n" + properties.syntax)
					}
				}
				message.channel.send(embed)
					.then(message => {
						log.help(message)
						return resolve(command)
					})
					.catch(reject)
			}


			if (command === "scrape" && admin) {
				const channel = (args[0] === "here")
					? message.channel
					: client.channels.get(args[0])
				if (!channel)
					return reject(`${config.name} can't access the channel: first argument ${args[0]}`)

				const howManyMessages = (args[1] === "all")
					? -1
					: parseInt(args[1])
				if (isNaN(howManyMessages))
					return reject(`Second argument "${args[1]}" is not a number"`)

				say(message.channel, `Scraping ${howManyMessages} messages from [${channel.guild.name} - #${channel.name}]...`)
				scrape(channel, howManyMessages)
					.then(messagesAdded => {
						say(message.channel, `Added ${messagesAdded} messages.`)
						console.log("Saving corpi...")
						saveAllCorpi()
							.then(stats => console.log(`Corpi saved (${stats[0]}).`))
							.catch(stats => console.warn(`${stats[0]} corpi saved; ${stats[1]} failed.`))
					})
					.catch(err => {
						logError(err)
						say(message.channel, "ERROR! " + err)
					})
				resolve(command)
			}

			if (command === "imitate") {
				if (args[0]) {
					// Try to convert args[0] to a user
					if (isMention(args[0]))
						args[0] = getUserFromMention(args[0])
					else if (args[0] === "me") // Say "me" instead of pinging yourself
						args[0] = message.author
					else
						args[0] = client.users.get(args[0]) // Maybe it's a user ID

					try {
						if (markovs.has(args[0].id)) { // Is a user Bipolar can imitate
							imitate(args[0], message.channel)
								.then(log.imitate)
								.catch(logError)
						}
					} catch (err) {
						logError(err)
					}
				}
				resolve(command)
			}

		} catch (err) {
			logError(err)
			reject(err)
		}
		
	})
}


/**
 * Sets the custom nicknames from the config file
 * 
 * @return {Promise<void>} Whether there were errors or not
 */
function updateNicknames() {
	return new Promise ( (resolve, reject) => {
		var erred = false

		for (const serverName in config.nicknames) {
			const pair = config.nicknames[serverName]
			const server = client.guilds.get(pair[0])
			if (!server) {
				console.warn(`${config.name} isn't in ${pair[0]}! Nickname cannot be set here.`)
				continue
			}
			server.me.setNickname(pair[1])
				.catch(err => {
					erred = true
					logError(err)
				})
		}

		if (erred) return reject()
		resolve()

	})
}


/**
 * Make directory if it doesn't already exist
 *
 * @param {string} dir - Directory of which to ensure existence
 * @return {Promise<string|Error>} Directory if it already exists or was successfully made; error if something goes wrong
 */
function ensureDirectory(dir) {
	return new Promise ( (resolve, reject) => {
		if (!local) return resolve(dir) // Directories in S3 don't have to exist before they can be used
		fs.stat(dir, err => {
			if (err && err.code === "ENOENT") {
				fs.mkdir(dir, { recursive: true }, err => {
					if (err) return reject(err)
					resolve(dir)
				})
			} else if (err)
				return reject(err)
			resolve(dir)
		})
	})
}


/**
 * Reads a file from S3_BUCKET_NAME
 * 
 * @param {string} path - path to file to read from the S3 bucket
 * @return {Promise<Buffer|Error>} Buffer from bucket, else error
 */
function read(path) {
	return new Promise( (resolve, reject) => {
		if (local) {
			fs.readFile(path, (err, data) => {
				if (err) return reject(err)
				resolve(data)
			})
		}

		else {
			const params = {
				Bucket: process.env.S3_BUCKET_NAME, 
				Key: path
			}
			s3.getObject(params, (err, data) => {
				if (err) return reject(err)

				if (data.Body === undefined || data.Body === null)
					return reject(`Empty response at path: ${path}`)

				resolve(data.Body)
			})
		}
	})
}


function ls(dir) {
	return new Promise ((resolve, reject) => {
		if (local) {
			fs.readdir(dir, (err, files) => {
				if (err) return reject(err)
				resolve(files)
			})
		} else {
			const params = {
				Bucket: process.env.S3_BUCKET_NAME,
				Delimiter: "/",
				Prefix: dir
			}
			s3.listObjectsV2(params, (err, files) => {
				if (err) return reject(err)

				const fileList = []
				for (const entry in files.Contents) {
					fileList.push(entry.Key)
				}
				resolve(fileList)
			})
		}
	})
}


function write(path, data) {
	return new Promise( (resolve, reject) => {
		function cb(err, res) {
			if (err) return reject(err)
			resolve(res)
		}

		if (local) {
			fs.writeFile(path, data, cb)
		}
		
		else {
			const params = {
				Bucket: process.env.S3_BUCKET_NAME,
				Key: path,
				Body: Buffer.from(data, "UTF-8")
			}
			s3.upload(params, cb)
		}
	})
}


function saveAllCorpi() {
	return new Promise( (resolve, reject) => {
		var saved = 0
		var failed = 0
		for (const [userId, corpus] of corpi.entries()) {
			write(`${config.corpusDir}/${userId}.txt`, corpus)
				.then(saved++)
				.catch(err => {
					failed++
					logError(err)
				})
		}
		(failed) // not 0
			? reject([saved, failed])
			: resolve([saved, failed])
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
 * Randomly chooses a key from a collection
 * 
 * @param {Collection} collection
 * @return {any} random key from collection
 */
function randomKey(collection) {
	const index = Math.floor(Math.random() * collection.size)
	let counter = 0
	for (const key of collection.keys()) {
		if (counter++ === index) {
			return key
		}
	}
}


/**
 * Get status name from status code
 * 
 * @param {number} code - status code
 * @return {string} status name
 */
function statusCode(code) {
	return ["Playing", "Streaming", "Listening", "Watching"][code]
}


/**
 * @param {string} mention
 * @return {User} User if exists, null if not
 */
function getUserFromMention(mention) {
	if (mention && mention.startsWith("<@") && mention.endsWith(">")) {
		mention = mention.slice(
			(mention.charAt(2) === "!")
				? 3
				: 2
			, -1
		)

		return client.users.get(mention)
	}

	return null
}


/**
 * @param {string} word - a word that may or may not be a mention
 * @return {Boolean} whether word is a mention or not
 */
function isMention(word) {
	return word.startsWith("<@") && word.endsWith(">")
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
		if (obj[i] == val)
			return true
	}
	return false
}


function isAdmin(userId) {
	return has(userId, config.admins)
}


function isBanned(userId) {
	return has(userId, config.banned)
}


function channelWhitelisted(channelId) {
	return has(channelId, config.channels)
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
	return `[${message.guild.name} - #${message.channel.name}]`
}


function channelTable() {
	return new Promise( (resolve, reject) => {
		if (isEmpty(config.channels))
			return reject("No channels are whitelisted.")

		const stats = {}
		for (const i in config.channels) {
			const channelId = config.channels[i]
			const channel = client.channels.get(channelId)
			const stat = {}
			stat["Server"] = channel.guild.name
			stat["Name"] = "#" + channel.name
			stats[channelId] = stat
		}
		resolve(stats)
	})
}


function nicknameTable() {
	return new Promise( (resolve, reject) => {
		if (isEmpty(config.nicknames))
			return reject("No nicknames defined.")

		const stats = {}
		for (const i in config.nicknames) {
			const server = client.guilds.get(config.nicknames[i][0])
			const stat = {}
			stat["Server"] = server.name
			stat["Nickname"] = server.me.nickname
			stats[pair[0]] = stat
		}
		resolve(stats)
	})
}


/**
 * DM's garlicOS and logs error
 */
function logError(err) {
	console.error(err)
	const sendThis = (err.message)
		? `ERROR! ${err.message}`
		: `ERROR! ${err}`

	client.users.get("206235904644349953").send(sendThis)
		.then(resolve)
		.catch(console.error)
}


// --- /FUNCTIONS -------------------------------------------
