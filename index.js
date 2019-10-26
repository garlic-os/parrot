"use strict"
// Permissions code: 67584
// Send messages, read message history

// Load environment variables to const config
// JSON parse any value that is JSON parseable
const config = {}
for (const key in process.env) {
	try {
		config[key] = JSON.parse(process.env[key])
	} catch (e) {
		config[key] = process.env[key]
	}
}

if (config.NODE_ENV === "production")
	process.on("unhandledRejection", logError)
else
	process.on("unhandledRejection", up => { throw up })

process.on("SIGTERM", () => {  // (Hopefully) save and cleaer cache before shutting down
	console.info("Saving changes...")
	saveCache()
		.then(console.info("Changes saved."))
		.finally( () => { // Regardless of whether it succeeds
			console.info("Clearing cache...")
			clearCache()
				.then(console.info("Cache cleared."))
		})
})

// Requirements
require("console-stamp")(console, {
	datePrefix: "",
	dateSuffix: "",
	pattern: " "
})

// Requirements
const markov = require("./markov"), // Local markov.js file
      Discord = require("discord.js"),
      fs = require("fs"),
      AWS = require("aws-sdk"),
	  path = require("path")

// Configure AWS-SDK to access an S3 bucket
AWS.config.update({
	accessKeyId: config.AWS_ACCESS_KEY_ID,
	secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
	region: "us-east-1"
})
const s3 = new AWS.S3()

// List of promises
const init = []

// Local directories have to exist before they can be accessed
init.push(ensureDirectory("./cache"))

// Cache a list of user IDs to cut down on S3 requests
const userIdsCache = []
init.push(s3listUserIds().then(userIds => {
	for (const userId of userIds) {
		userIdsCache.push(userId)
	}
}))

// Reusable log messages
const log = {
	  say:     message => console.log(`${location(message)} Said: ${message.content}`)
	, imitate: message => console.log(`${location(message)} Imitated ${message.embeds[0].fields[0].name}, saying: ${message.embeds[0].fields[0].value}`)
	, error:   message => console.log(`${location(message)} Sent the error message: ${message.embeds[0].fields[0].value}`)
	, xok:     message => console.log(`${location(message)} Send the XOK message.`)
	, help:    message => console.log(`${location(message)} Sent the Help message`)
}

const buffers = {},
      unsavedCache = []

const client = new Discord.Client()


// --- LISTENERS ---------------------------------------------

client.on("ready", () => {
	console.info(`Logged in as ${client.user.tag}.\n`)
	updateNicknames()

	// "Watching everyone"
	client.user.setActivity(`everyone (${config.PREFIX}help)`, { type: "WATCHING" })
		.then(presence => console.info(`${config.NAME}'s activity: ${statusCode(presence.game.type)} ${presence.game.name}`))
	
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

	if (!isBanned(authorId) // Not banned from using Bipolar
	   && (channelWhitelisted(message.channel.id) // Channel is either whitelisted or is a DM channel
		  || message.channel.type === "dm")
	   && message.author.id !== client.user.id) { // Not self

		// Ping
		if (message.isMentioned(client.user)
		   && !message.author.bot // Not a bot
		   && !message.content.includes(" ")) { // Message has no spaces (i.e. contains nothing but a ping)
			console.log(`${location(message)} Pinged by ${message.author.tag}.`)
			randomUser().then(user => {
				imitate(user).then(sentence => {
					message.channel.send(imitateEmbed(user, sentence, message.channel))
						.then(log.imitate)
				})
			})
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
				randomUser().then(user => {
					imitate(user).then(sentence => {
						message.channel.send(imitateEmbed(user, sentence, message.channel))
							.then(log.imitate)
					})
				})
			}

			if (message.content.length > 0) {
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
					setTimeout( () => {
						appendCorpus(authorId, buffers[authorId]).then( () => {
							unsavedCache.push(authorId)
							if (!userIdsCache.includes(authorId))
								userIdsCache.push(authorId)

							console.log(`${location(message)} Learned from ${message.author.tag}:`, buffers[authorId])
							buffers[authorId] = ""
						})
					}, 5000)
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

// When all initalization promises have resolved
Promise.all([init]).then( () => {
	console.info("Logging in...")
	client.login(process.env.DISCORD_BOT_TOKEN)

	// Autosave
	setInterval( () => {
		saveCache()
	}, config.AUTOSAVE_INTERVAL_MS)
})
.catch( () => {
	console.error("One or more initialization steps have failed:")
	console.error(init)
	throw "Startup failure"
})


// --- /LOGIN ------------------------------------------------

// --- FUNCTIONS ---------------------------------------------


/**
 * Generates a sentence based off [user]'s corpus
 * 
 * @param {User} user - User to generate a sentence from
 * @return {Promise<string|Error>} Resolve: sentence; Reject: error loading [user]'s corpus
 */
function imitate(user) {
	return new Promise( (resolve, reject) => {
		loadCorpus(user.id).then(corpus => {
			const wordCount = ~~(Math.random() * 49 + 1) // 1-50 words
			markov(corpus, wordCount).then(quote => {
				resolve(quote.substring(0, 1024)) // Hard maximum of 1024 characters (embed field limit)
			})
		})
		.catch(reject)
	})
}

function randomUser() {
	return new Promise( (resolve, reject) => {
		const maxRetries = 5
		let index
		let user

		for (let i=0; i<maxRetries; i++) {
			index = ~~(Math.random() * userIdsCache.length - 1)
			user = client.users.get(userIdsCache[index])
			if (user) return resolve(user)
			else logError(`randomUser(${userIdsCache[index]}): user not found`)
		}

		reject(`randomUser() failed: tried ${maxRetries} times`)
	})
}


/**
 * Generates a Discord Rich Embed object out of the supplied information
 * 
 * @param {User} str - messages to print
 * @return {RichEmbed} Discord Rich Embed object
 */
function defaultEmbed(str) {
	return new Discord.RichEmbed()
		.setColor(config.EMBED_COLORS.normal)
		.addField(config.NAME, str)
}


/**
 * Generates a Discord Rich Embed object out of the supplied information
 * 
 * @param {User} user - Shows this user's avatar and nickname
 * @param {string} quote - Shows this text
 * @param {Channel} channel - User's nickname is fetched from this channel
 * @return {RichEmbed} Discord Rich Embed object
 */
function imitateEmbed(user, quote, channel) {
	return new Discord.RichEmbed()
		.setColor(config.EMBED_COLORS.normal)
		.setThumbnail(user.displayAvatarURL)
		.addField(channel.members.get(user.id).displayName, quote)
}

/**
 * Generates a Discord Rich Embed object out of the supplied information
 * 
 * @param {string} err - Error to print
 * @return {RichEmbed} Discord Rich Embed object
 */
function errorEmbed(err) {
	return new Discord.RichEmbed()
		.setColor(config.EMBED_COLORS.error)
		.addField("Error", err)
}


function xokEmbed() {
	return new Discord.RichEmbed()
		.attachFiles(["./img/xok.png"])
		.setColor(config.EMBED_COLORS.error)
		.setTitle("Error")
		.setImage("attachment://xok.png")
}


/**
 * Scrapes [howManyMessages] messages from [channel].
 * Adds the messages to their corresponding user's corpus.
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
		const scrapeBuffers = {}

		function _getBatchOfMessages(counter, fetchOptions) {
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

				if (messages.size >= 100 && counter != 0) // Next request won't be empty and hasn't gotten enough messages
					_getBatchOfMessages(counter-1, fetchOptions)

				for (let message of messages) {
					if (Array.isArray(message)) message = message[1] // In case message is actually in message[1]
					scrapeBuffers[message.author.id] += message.content + "\n"
					messagesAdded++
				}
				activeLoops--
			})
		}
		_getBatchOfMessages(howManyRequests, fetchOptions)

		const whenDone = setInterval( () => {
			if (activeLoops === 0) {
				clearInterval(whenDone)

				for (const userId in scrapeBuffers) {
					appendCorpus(userId, scrapeBuffers[userId]).then( () => {
						unsavedCache.push(message.author.id)
						if (!userIdsCache.includes(authorId))
							userIdsCache.push(authorId)
					})
				}
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
 * @param {Message} messageObj - Discord message to be parsed
 * @return {Promise<string>} Resolve: name of command performed; Reject: error
 */
function handleCommands(message) {
	return new Promise ( (resolve, reject) => {
		if (message.author.bot) return resolve(null)

		console.log(`${location(message)} Received a command from ${message.author.tag}: ${message.content}`)

		const args = message.content.slice(config.PREFIX.length).split(/ +/)
		const command = args.shift().toLowerCase()

		try {
			const admin = isAdmin(message.author.id)
			switch (command) {
				case "help":
					// "Help" command
					const help = {
						help: {
							admin: false,
							desc: `Help.`,
							syntax: `${config.PREFIX}help`
						},
						imitate: {
							admin: false,
							desc: `Imitate a user.`,
							syntax: `${config.PREFIX}imitate <ping a user>`
						},
						save: {
							admin: true,
							desc: `Upload all unsaved cache to S3.`,
							syntax: `${config.PREFIX}save`
						},
						scrape: {
							admin: true,
							desc: `Save [howManyMessages] messages in [channel].`,
							syntax: `${config.PREFIX}scrape <channelID> <howManyMessages>`
						},
						embed: {
							admin: true,
							desc: `Generate an embed.`,
							syntax: `${config.PREFIX}embed <message>`
						},
						error: {
							admin: true,
							desc: `Generate an error embed.`,
							syntax: `${config.PREFIX}error <message>`
						}
					}

					const embed = new Discord.RichEmbed()
						.setColor(config.EMBED_COLORS.normal)
						.setTitle("Help")
					
					if (help.hasOwnProperty(args[0])) {
						if (help[args[0]].admin && !admin) { // Command is admin only and user is not an admin
							break
						} else {
							embed.addField(args[0], help[args[0]].desc + "\n" + help[args[0]].syntax)
						}
					} else {
						for (const [command, properties] of Object.entries(help)) {
							if (!(properties.admin && !admin)) // If the user is not an admin, do not show admin-only commands
								embed.addField(command, properties.desc + "\n" + properties.syntax)
						}
					}
					message.author.send(embed) // DM the user the help embed instead of putting it in chat since it's kinda big
						.then(log.help)
						.catch(reject)
					break


				case "scrape":
					if (!admin) {
						message.channel.send(errorEmbed("You aren't allowed to use this command."))
							.then(log.error)
						break
					}
					const channel = (args[0] === "here")
						? message.channel
						: client.channels.get(args[0])
					if (!channel) {
						message.channel.send(errorEmbed(`Channel not accessible: ${args[0]}`))
							.then(log.error)
						break
					}

					const howManyMessages = (args[1] === "all")
						? "Infinity" // lol
						: parseInt(args[1])
					if (isNaN(howManyMessages)) {
						message.channel.send(errorEmbed(`Not a number: ${args[1]}`))
							.then(log.error)
						break
					}

					message.channel.send(defaultEmbed(`Scraping ${howManyMessages} messages from [${channel.guild.name} - #${channel.name}]...`))
						.then(log.say)

					scrape(channel, howManyMessages)
						.then(messagesAdded => {
							message.channel.send(defaultEmbed(`Added ${messagesAdded} messages.`))
								.then(log.say)
						})
						.catch(err => {
							message.channel.send(errorEmbed(err))
								.then(log.error)
						})
					break

				case "imitate":
					if (args[0]) {
						// Try to convert args[0] to a user
						if (isMention(args[0]))
							args[0] = getUserFromMention(args[0])
						else if (args[0] === "me") // You can say "me" instead of pinging yourself
							args[0] = message.author
						else
							args[0] = client.users.get(args[0]) // Maybe it's a user ID

						if (!args[0])
							randomUser().then(user => args[0] = user) // Set args[0] to a random user

					} else {
						randomUser().then(user => args[0] = user)
					}

					if (args[0].id === client.user.id) {
						message.channel.send(xokEmbed())
					} else {
						imitate(args[0]).then(sentence => {
							message.channel.send(imitateEmbed(args[0], sentence, message.channel))
						})
					}
					break

				case "embed":
					if (!admin || !args[0]) break
					message.channel.send(defaultEmbed(args.join(" ")))
						.then(log.say)
					break

				case "error":
					if (!admin || !args[0]) break
					message.channel.send(errorEmbed(args.join(" ")))
						.then(log.error)
					break
					
				case "xok":
					if (!admin) break
					message.channel.send(xokEmbed())
						.then(log.xok)
					break

				case "save":
					if (!admin) break
					if (unsavedCache.length === 0) {
						message.channel.send(errorEmbed("Nothing to save."))
						break
					}
					message.channel.send(defaultEmbed("Saving..."))
					saveCache()
						.then(savedCount => {
							message.channel.send(defaultEmbed(`Saved ${savedCount} ${(savedCount === 1) ? "corpus" : "corpi"}.`))
						})
					break
			}
			resolve(command)

		} catch (err) {
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

		for (const serverName in config.NICKNAMES) {
			const pair = config.NICKNAMES[serverName]
			const server = client.guilds.get(pair[0])
			if (!server) {
				console.warn(`${config.NAME} isn't in ${pair[0]}! Nickname cannot be set here.`)
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
 * Downloads a file from S3_BUCKET_NAME.
 * 
 * @param {string} path - path to file to download from the S3 bucket
 * @return {Promise<Buffer|Error>} Resolve: Buffer from bucket; Reject: error
 */
function s3read(path) {
	return new Promise( (resolve, reject) => {
		const params = {
			Bucket: process.env.S3_BUCKET_NAME, 
			Key: path
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
 * Uploads (and overwrites) a file to S3_BUCKET_NAME.
 * 
 * @param {string} path - path to upload to
 * @return {Promise<Object|Error>} Resolve: success response; Reject: Error
 */
function s3write(path, data) {
	return new Promise( (resolve, reject) => {
		const params = {
			Bucket: process.env.S3_BUCKET_NAME,
			Key: path,
			Body: Buffer.from(data, "UTF-8")
		}
		s3.upload(params, (err, res) => {
			if (err) return reject(err)
			resolve(res)
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
			res = res.Contents.map(file => {
				return path.basename(file.Key.replace(/\.[^/.]+$/, "")) // Remove file extension and preceding path
			})
			resolve(res)
		})
	})
}


/**
 * Uploads all unsaved cache to S3
 *   and empties the list of unsaved files.
 * 
 * @return {Promise<void|Error>} Resolve: nothing; Reject: s3write() error
 */
function saveCache() {
	return new Promise( (resolve, reject) => {
		let savedCount = 0
		let operations = 0
		while (unsavedCache.length > 0) {
			operations++
			const userId = unsavedCache.pop()
			loadCorpus(userId).then(corpus => {
				s3write(`${config.CORPUS_DIR}/${userId}.txt`, corpus)
					.then( () => {
						savedCount++
						operations--
					})
					.catch(reject)
			})
		}

		const whenDone = setInterval( () => {
			if (operations === 0) {
				clearInterval(whenDone)
				resolve(savedCount)
			}
		}, 100)
	})
}


/**
 * Delete the cache folder.
 * 
 * @return {Promise<void|Error>} Resolve: nothing; Reject: Error
 */
function clearCache() {
	return new Promise( (resolve, reject) => {
		fs.rmdir("./cache", err => {
			if (err) return reject(err)
			resolve()
		})
	})
}


/**
 * Make directory if it doesn't exist
 *
 * @param {string} dir - Directory of which to ensure existence
 * @return {Promise<string|Error>} Directory if it already exists or was successfully made; error if something goes wrong
 */
function ensureDirectory(dir) {
	return new Promise ( (resolve, reject) => {
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
 * Try to load the corpus corresponding to [userId] from cache.
 * If the corpus isn't in cache, try to download it from S3.
 * If it isn't there either, give up.
 * 
 * @param {string} userId - user ID whose corpus to load
 * @return {Promise<corpus|Error>} Resolve: [userId]'s corpus; Reject: Error
 */
function loadCorpus(userId) {
	return new Promise( (resolve, reject) => {
		cacheRead(userId) // Maybe the user's corpus is in cache
			.then(resolve)
			.catch(err => {
				if (err.code !== "ENOENT") // Only proceed if the reason cacheRead() failed was
					return reject(err) // because it couldn't find the file

				s3read(`${config.CORPUS_DIR}/${userId}.txt`).then(corpus => { // Maybe the user's corpus is in the S3 bucket
					cacheWrite(userId, corpus)
					resolve(corpus)
				})
				.catch(reject) // User is nowhere to be found (or something went wrong)
			})
	})
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
				(err) ? reject(err) : resolve()
			})
		} else {
			s3read(`${config.CORPUS_DIR}/${userId}.txt`) // Download the corpus from S3, add the new data to it, cache it
				.then(corpus => cacheWrite(userId, corpus + data))
				.catch(cacheWrite(userId, data)) // User doesn't exist; make them a new corpus from just the new data
				.finally(resolve)
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
			if (err) return reject(err)
			resolve()
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
				: 2 // TODO: make this not comically unreadable
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


function channelWhitelisted(channelId) {
	return has(channelId, config.CHANNEL_WHITELIST)
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
 *   what channels are whitelisted.
 * 
 * @example
 *     channelTable().then(console.table)
 */
function channelTable() {
	return new Promise( (resolve, reject) => {
		if (isEmpty(config.CHANNEL_WHITELIST))
			return reject("No channels are whitelisted.")

		const stats = {}
		for (const i in config.CHANNEL_WHITELIST) {
			const channelId = config.CHANNEL_WHITELIST[i]
			const channel = client.channels.get(channelId)
			const stat = {}
			stat["Server"] = channel.guild.name
			stat["Name"] = "#" + channel.name
			stats[channelId] = stat
		}
		resolve(stats)
	})
}


/**
 * Generates an object containing stats about
 *   what nicknames Bipolar has and what
 *   servers in which she has them.
 * 
 * @example
 *     nicknameTable().then(console.table)
 */
function nicknameTable() {
	return new Promise( (resolve, reject) => {
		if (isEmpty(config.NICKNAMES))
			return reject("No nicknames defined.")

		const stats = {}
		for (const i in config.NICKNAMES) {
			const pair = config.NICKNAMES[i]
			const server = client.guilds.get(pair[0])
			const stat = {}
			stat["Server"] = server.name
			stat["Nickname"] = server.me.nickname
			stats[pair] = stat
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

	client.users.get("206235904644349953").send(sendThis) // yes, i hardcoded my own user id. im sorry
		.catch(console.error)
}


// --- /FUNCTIONS -------------------------------------------
