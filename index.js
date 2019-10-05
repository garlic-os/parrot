// Permissions code: 67584
// Send messages, read message history

require("console-stamp")(console, {
	datePrefix: "",
	dateSuffix: "",
	pattern: " "
})

const name = "Bipolar"
const corpusDir = "./corpus"

console.log(`${name} started.`)

// Crash when a reject() doesn't have a .catch(); useful for debugging
process.on("unhandledRejection", up => { throw up })

const local = process.env.LOCAL != "0" && process.env.LOCAL != "false"

const Markov = require("./markov") // Local markov.js file
const Discord = require("discord.js")
const fs = require("fs")
const AWS = require("aws-sdk")

const { // Assign the keys in the config file to variables
	prefix,
	channels,
	admins,
	banned,
	users,
	nicknames
} = JSON.parse(fs.readFileSync("./" + process.env.CONFIG_FILENAME, "UTF-8"))

ensureDirectorySync(corpusDir)

console.log("Corpi:", fs.readdirSync(corpusDir).toString())


// Markov setup 
console.info("Loading corpi and spawning Markovs...")
const writeables = new Map()
const corpi = new Map() // Plural of corpus is corpi dont @ me
const markovs = new Map()
regenerateAll()
console.info("Markovs are ready.")


AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
const s3 = new AWS.S3()


const help = {
	scrape: {
		admin: true,
		desc: `Sorts through [howManyMessages] messages in [channel] for messages from [users].`,
		syntax: `Syntax: ${prefix}scrape <channelID> <howManyMessages> [...users (IDs only)]`
	},
	imitate: {
		admin: false,
		desc: `Imitate a user.`,
		syntax: `Syntax: ${prefix}imitate <ping user>`
	}
}

// Reusable log messages
const log = {
	say:      message  => console.log(`${location(message)} Said: ${message.content}`),
	imitate:  res      => console.log(`[${res.channel.guild.name} - #${res.channel.name}] Imitated ${res.user.tag}, saying: ${res.str}`),
	presence: presence => console.log(`Set ${name}'s activity: ${statusCode(presence.game.type)} ${presence.game.name}`),
	help:     message  => console.log(`${location(message)} Sent the Help box`)
}


const client = new Discord.Client()


// --- LISTENERS ---------------------------------------------

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}.\n`)
	updateNicknames()

	// "Watching everyone"
	client.user.setActivity(`everyone (${prefix}help)`, { type: "WATCHING" })
		.then(log.presence)
		.catch(console.error)

	printRegisteredChannels()
})


client.on("message", message => {
	const authorId = message.author.id

	if ((!isBanned(authorId)) // Not banned from using Bipolar
		&& (channelWhitelisted(message.channel.id)) || // Channel is either whitelisted or is a DM channel
			(message.channel.type == "dm")) {

		// Ping
		if (message.isMentioned(client.user) && !message.author.bot) {
			if (message.content.split(" ").length === 1) { // Message is one word (i.e. only the ping)
				imitateRandom(message.channel)
					.then(log.imitate)
					.catch(console.error)
			}
		}

		// Command
		else if (message.content.startsWith(prefix)) {
			handleCommands(message)
		}
		
		// If the message is nothing special, maybe imitate someone anyway
		else if (blurtChance()) {
			console.log(`${locationString(message)} Randomly decided to imitate someone in response to ${message.author.tag}'s message.`)
			imitateRandom(message.channel)
				.then(log.imitate)
				.catch(console.error)
		}

		if (monitoring(authorId)) {
			ensureWriteStream(authorId).then(writeStream => {
				writeStream.write(message.content + "\n", () => {
					regenerate(authorId).catch(console.error)
				})
			})
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

const in_ = "Logging in..."
console.log(in_) // log in_
client.login(process.env.DISCORD_BOT_TOKEN) // log in

// --- /LOGIN ------------------------------------------------

// --- FUNCTIONS ---------------------------------------------


/**
 * Reloads all corpus files and
 *   regenerates all Markov chains
 */
function regenerateAll() {
	corpi.clear() // Make sure a user gets cleared from memory if
	markovs.clear() // they are deleted from storage

	for (const userId of fs.readdirSync(corpusDir)) { // Every subdirectory in corpusDir (which are all supposed to be user IDs)
		regenerate(userId).catch(err => {
			if (err.message !== "NODATA") {
				throw err
			}
		})
	}
}


/**
 * Reloads the corpus file and
 *   regenerates the Markov chain
 *   that correspond to [userId]
 * 
 * @param {string} userId - regenerates the Markov for this user
 * @return {Promise<void|Error} void
 */
function regenerate(userId) {
	return new Promise( (resolve, reject) => {
		fs.readFile(`${corpusDir}/${userId}/corpus.txt`, "UTF-8", (err, corpus) => { // Read the corpus.txt inside
			if (err) {
				reject(err)
			} else if (corpus.length === 0) {
				reject(Error("NODATA"))
			} else {
				corpi.set(userId, corpus) // Map the directory to its corpus
				markovs.set(userId, new Markov(corpus)) // Map the directory to a Markov, which gets that directory's corpus.txt
				resolve()
			}
		})
	})
}


/**
 * Maps [userId] to a write stream
 *   for [userId]'s corpus.
 * 
 * @param {string} userId - create a write stream for this user's corpus
 * @return {Promise<void|Error} Promise
 */
function setWriteStream(userId) {
	return new Promise( (resolve, reject) => {
		ensureDirectory(`${corpusDir}/${userId}`).then(dir => {
			writeables.set(
				userId,
				fs.createWriteStream(
					`${dir}/corpus.txt`
					, { flags: "a" }
				)
			)
			resolve()
		})
		.catch(reject)	
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


/** UNUSED
 * Randomly chooses a value from a collection
 * 
 * @param {Collection} collection
 * @return {any} random value from collection
 */
/*function randomChoice(collection) {
	const index = Math.floor(Math.random() * collection.size)
	let counter = 0
	for (const value of collection.values()) {
		if (counter++ === index) {
			return value
		}
	}
}*/


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
		if (!user) reject("User not found")
		const str = markovs.get(user.id).generate().substring(0, 342)
		const embed = new Discord.RichEmbed()
			.setColor("#9A5898") // Lavender
			.setThumbnail(user.displayAvatarURL)
			.addField(channel.members.get(user.id).displayName, str)

		channel.send(embed)
			.then( () => {
				resolve( { user: user, channel: channel, str: str } )
			})
			.catch(reject)
	})
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


function monitoring(userId) {
	return has(userId, users)
}


function isAdmin(userId) {
	return has(userId, admins)
}


function isBanned(userId) {
	return has(userId, banned)
}


function channelWhitelisted(channelId) {
	return has(channelId, channels)
}


function printRegisteredChannels() {
	if (isEmpty(channels)) {
		console.warn("No channels are whitelisted.")
	} else {
		console.info("Channels:")
		for (const channelName in channels) {
			console.info(`	${channelName} (ID: ${channels[channelName]})`)
		}
		console.info()
	}
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


function say(channel, string) {
	channel.send(string)
		.then(log.say)
		.catch(console.error)
}


/**
 * Scrape channel
 * Records each user's messages to [corpusDir]/[userId]/corpus.txt
 *
 * @param {Channel} channel - what channel to scrape
 * @param {number} howManyMessages - number of messages to scan (a negative number will scan all messages)
 * @param {string[]} [userIds=users] - array of user IDs to get messages from (default: the user IDs in the config file)
 * @return {Promise<number|Error>} number of messages added
 */
function scrape(channel, howManyMessages, userIds) {
	return new Promise( (resolve, reject) => { try {
		userIds = userIds || Object.values(users) // default: config's user IDs
		const howManyRequests = Math.ceil(howManyMessages / 100)
		const fetchOptions = { limit: 100 /*, before: [last message from previous request]*/ }
		const global = {
			activeLoops: 0,
			messagesAdded: 0
		}

		function _loop(counter, fetchOptions) {
			global.activeLoops++
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

					const index = userIds.indexOf(message.author.id)
					if (index !== -1) { // Supposed to log this user
						const userId = userIds[index]

						ensureWriteStream(userId).then(writeStream => {
							writeStream.write(message.content + "\n")
						})
						
						global.messagesAdded++
					}
				}

				global.activeLoops--
			})
		}
		_loop(howManyRequests, fetchOptions)

		const whenDone = setInterval( () => {
			if (global.activeLoops === 0) {
				clearInterval(whenDone)
				resolve(global.messagesAdded)
			}
		}, 100)
	
	} catch (err) {
		reject(err)
	}})
}


function handleCommands(message) {
	return new Promise ( (resolve, reject) => {
		if (message.author.bot) { reject("Bots are not allowed to use commands"); return }

		const args = message.content.slice(prefix.length).split(/ +/)
		const command = args.shift().toLowerCase()

		try {
			const admin = isAdmin(message.author.id)

			if (command === "help") {
				const embed = new Discord.RichEmbed()
					.setColor("#9A5898") // Lavender
					.setTitle("Help")
				
				if (help.hasOwnProperty(args[0])) {
					if (help[args[0]].admin && !admin) { // Command is admin only and user is not an admin
						resolve(command)
						return
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
						resolve(command)
						return
					})
					.catch(reject)
			}


			if (command === "scrape" && admin) {
				const channel = (args[0] === "here")
					? message.channel
					: client.channels.get(args[0])
				if (!channel) {
					reject(`${name} can't access the channel: first argument ${args[0]}`)
					return
				}

				const howManyMessages = (args[1] === "all")
					? -1
					: parseInt(args[1])
				if (isNaN(howManyMessages)) {
					reject(`Second argument "${args[1]}" is not a number"`)
					return
				}

				const userIds = (args[2])
					? args.slice(2, "Infinity") // Every element except the first two; is there a less hacky way to do this?
					: Object.values(users)

				say(message.channel, `Scraping ${howManyMessages} messages from [${channel.guild.name} - #${channel.name}]...`)
				scrape(channel, howManyMessages, userIds)
					.then(messagesAdded => {
						say(message.channel, `Added ${messagesAdded} messages.`)
					})
					.catch(err => {
						say(message.channel, err)
					})
				resolve(command)
			}

			if (command === "imitate") {
				if (args[0]) { 
					// Try to convert args[0] to a user
					if (isMention(args[0]))
						args[0] = getUserFromMention(args[0])
					else
						args[0] = client.users.get(args[0]) // maybe it's a user ID

					if (markovs.has(args[0].id)) { // Is a user Bipolar can imitate
						imitate(args[0], message.channel)
							.then(log.imitate)
							.catch(console.error)
					}
				}
				resolve(command)
			}

		} catch (err) {
			console.error(err)
			reject(err)
		}
		
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
		fs.stat(dir, err => {
			if (err && err.code === "ENOENT") {
				fs.mkdir(dir, { recursive: true }, err => {
					if (err)
						reject(err)
					else
						resolve(dir)
				})
			} else if (err) {
				reject(err)
			} else {
				resolve(dir)
			}
		})
	})
}


/**
 * Make directory if it doesn't already exist
 * ~Synchronous edition!~
 *
 * @param {string} dir - Direectory of which to ensure existence
 * @return {string} Directory if it already exists or was successfully made (throws error otherwise)
 */
function ensureDirectorySync(dir) {
	try {
		fs.mkdirSync(dir, { recursive: true })
	} catch (err) {
		if (err.code !== "EEXIST")
			throw err
	}
	return dir
}


/**
 * Make a WriteStream if it doesn't already exist
 * 
 * @param {string} userId - ID for the WriteStream
 * @return {Promise<WriteStream>} Promise of a WriteStream
 */
function ensureWriteStream(userId) {
	return new Promise(resolve => {
		if (writeables.has(userId)) {
			resolve(writeables.get(userId))
		} else {
			setWriteStream(userId).then( () => {
				resolve(writeables.get(userId))
			})
		}
	})
}


/**
 * @param {string} mention
 * @return {User} User if exists, null if not
 */
function getUserFromMention(mention) {
	if (!mention) return null

	if (mention.startsWith("<@") && mention.endsWith(">")) {
		mention = mention.slice(2, -1)

		if (mention.startsWith("!"))
			mention = mention.slice(1)

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
 * Shortcut to a reusable message location string
 * 
 * @param {Message} message
 * @return {string} - "[Server - #channel]" format string
 */
function location(message) {
	return `[${message.guild.name} - #${message.channel.name}]`
}


/**
 * Reads a file from S3_BUCKET_NAME
 * 
 * @param {string} fileName - file to read from the S3 bucket
 * @return {Promise<string|Error>} Buffer from bucket, else error
 */
function s3Read(fileName) {
	return new Promise( (resolve, reject) => {
		const params = {
			Bucket: process.env.S3_BUCKET_NAME, 
			Key: "bipolar/" + fileName
		}

		s3.getObject(params, (err, data) => {
			if (data.Body === undefined || data.Body === null) {
				reject(data.Body)
			} else {
				if (err)
					reject(err)
				else
					resolve(data.Body)
			}
		})
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

		for (const serverName in nicknames) {
			const pair = nicknames[serverName]
			const server = client.guilds.get(pair[0])
			if (!server) {
				console.warn(`${name} isn't in ${pair[0]}! Nickname cannot be set here.`)
				continue
			}
			server.me.setNickname(pair[1])
				.then(console.log(`Custom nickname in ${pair[0]}: ${pair[1]}.\n`))
				.catch(err => {
					erred = true
					logError(err)
				})
		}

		(erred)
			? reject()
			: resolve()

	})
}


// --- /FUNCTIONS --------------------------------------------

