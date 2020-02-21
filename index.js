"use strict"

// Permissions code: 67584
// Send messages, read message history

// Load environment variables to const config
// JSON parse any value that is JSON parseable
const config = require("./schism/defaults")
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


/**
 * Do all these things before logging in
 * @type {Promise[]} array of Promises
 */
const init = []

// Set BAD_WORDS if BAD_WORDS_URL is defined
if (config.BAD_WORDS_URL) {
	init.push(
		(async () => {
			const data = await httpsDownload(config.BAD_WORDS_URL)
			config.BAD_WORDS = data.split("\n")
		})()
	)
}


const log = {
	say:     message => console.log(`${location(message)} Said: ${message.embeds[0].fields[0].value}`)
  , imitate: {
		text: ([ message, name, sentence ]) => console.log(`${location(message)} Imitated ${name}, saying: ${sentence}`),
		hook: hookRes => console.log(`${location(hookRes)} Imitated ${hookRes.author.username.substring(4)}, saying: ${hookRes.content}`)
	}
  , error:   message => console.log(`${location(message)} Sent the error message: ${message.embeds[0].fields[0].value}`)
  , xok:     message => console.log(`${location(message)} Sent the XOK message.`)
  , help:    message => console.log(`${location(message)} Sent the Help message.`)
  , save:    count   => `Saved ${count} ${(count === 1) ? "corpus" : "corpi"}.`
  , pinged:  message => console.log(`${location(message)} Pinged by ${message.author.tag}.`)
  , command: message => console.log(`${location(message)} Received a command from ${message.author.tag}: ${message.content}`)
  , blurt:   message => console.log(`${location(message)} Randomly decided to imitate ${message.author.tag} in response to their message.`)
}


// Lots of consts
const Discord     = require("discord.js")
	, corpusUtils = require("./schism/corpus")
	, embeds      = require("./schism/embeds")
	, help        = require("./schism/help")

    , buffers = {}
    , hookSendQueue = []
    , hooks = parseHooksDict(config.HOOKS)

    , client = new Discord.Client()
	, scrape = require("./schism/scrape")(client, corpusUtils)
	, markov = require("./schism/markov")(client, corpusUtils)


// (Hopefully) save before shutting down
process.on("SIGTERM", async () => {
	console.info("Saving changes...")
	const savedCount = await corpusUtils.saveAll()
	console.info(log.save(savedCount))
})


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
				const userID = await markov.randomUserID()
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
				imitate(authorID, message.channel)
			}
		}

		if (learningIn(channelID) // Channel is listed in LEARNING_CHANNELS (no learning from DMs)
		   && !message.content.startsWith(config.PREFIX)) { // Not a command
			/**
			 * Record the message to the user's corpus.
			 * Build up messages from that user until they have
			 *   been silent for at least five seconds,
			 *   then write them all to cache in one fell swoop.
			 * Messages will be saved to the cloud come the next autosave.
			 */
			if (isNaughty(message.content)) {
				const msg = `Bad word detected.
${message.author.tag} (ID: ${authorID}) said:
${message.content.substring(0, 1000)}
https://discordapp.com/channels/${message.guild.id}/${message.channel.id}?jump=${message.id}`
				console.warn(msg)
				dmTheAdmins(msg)
			} else {
				if (!buffers[authorID]) buffers[authorID] = ""

				// Don't learn from a message if it's just pinging Schism
				if (message.content !== `<@${client.user.id}>` || message.content !== `<@!${client.user.id}>`) {
					// Set a timeout to wait for the user to be quiet
					//   only if their buffer is empty.
					if (buffers[authorID].length === 0) {
						setTimeout( async () => {
							await corpusUtils.append(authorID, buffers[authorID])
							console.log(`${location(message)} Learned from ${message.author.tag}: ${buffers[authorID].slice(0, -1)}`)
							buffers[authorID] = ""
						}, 5000) // Five seconds
					}
					buffers[authorID] += message.content + "\n"
				}
			}
		}
	}
})


/**
 * When Schism is added to a server,
 *   DM the admins and log a message containing
 *   information about the server to help the
 *   admins set up Schism there.
 */
client.on("guildCreate", guild => {
	const embed = new Discord.RichEmbed()
		.setAuthor("Added to a server.")
		.setTitle(guild.name)
		.setDescription(guild.id)
		.setThumbnail(guild.iconURL)
		.addField(`Owner: ${guild.owner.user.tag}`, `${guild.ownerID}\n\n${guild.memberCount} members`)
		.addBlankField()

	let logmsg = `-------------------------------
Added to a new server.
${guild.name} (ID: ${guild.id})
${guild.memberCount} members
Channels:`

	/**
	 * Add an inline field to the embed and a
	 *   line to the log message
	 *   for every text channel in the guild.
	 */
	guild.channels.tap(channel => {
		if (channel.type === "text") {
			embed.addField(`#${channel.name}`, channel.id, true)
			logmsg += `\n#${channel.name} (ID: ${channel.id})`
		}
	})

	logmsg += "\n-------------------------------"
	dmTheDevs(embed)
	console.info(logmsg)
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
;( async () => {
	try {
		await Promise.all(init)
	} catch (err) {
		console.error("One or more initialization steps have failed:", init)
		console.error(err.stack)
		throw "Startup failure"
	}
	console.info("Logging in...")
	client.login(process.env.DISCORD_BOT_TOKEN)

	corpusUtils.startAutosave()
})()


// --- /LOGIN ------------------------------------------------

// --- FUNCTIONS ---------------------------------------------


/**
 * Send a message imitating a user.
 * 
 * @param {string} userID - ID corresponding to a user to imitate
 * @param (Channel) channel - channel to send the message to
 * @return {Promise}
 */
async function imitate(userID, channel) {
	let sentence = await markov.generateSentence(userID)
	let avatarURL, name

	try {
		// Try to get the information from the server the user is in,
		// so that Schism can use the user's nickname.
		const member = await channel.guild.fetchMember(userID)
		avatarURL = member.user.displayAvatarURL
		name = `Not ${member.displayName}`
	} catch (e) {
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


/**
 * Parse a message whose content is presumed to be a command
 *   and perform the corresponding action.
 * 
 * @param {Message} messageObj - Discord message to be parsed
 * @return {Promise<string>} name of command performed
 */
async function handleCommand(message) {
	log.command(message)

	const args = message.content.slice(config.PREFIX.length).split(/ +/)
	const command = args.shift().toLowerCase()

	const admin = isAdmin(message.author.id)

	const commands = {
		/**
		 * Compile an embed out of the commands in help.js.
		 * If the user is not an admin, the embed will not contain
		 *   admin commands.
		 */
		help: () => {
			const embed = new Discord.RichEmbed()
				.setColor(config.EMBED_COLORS.normal)
				.setTitle("Help")
			
			// Individual command
			if (help.hasOwnProperty(args[0])) {
				if (help[args[0]].admin && !admin) { // Command is admin only and user is not an admin
					message.author.send(embeds.error("Don't ask questions you aren't prepared to handle the asnwers to."))
						.then(log.error)
					return
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
		}


		, scrape: async () => {
			if (!admin) {
				message.channel.send(embeds.error("You aren't allowed to use this command."))
					.then(log.error)
				return
			}
			const channel = (args[0].toLowerCase() === "here")
				? message.channel
				: client.channels.get(args[0])

			if (!channel) {
				message.channel.send(embeds.error(`Channel not accessible: ${args[0]}`))
					.then(log.error)
				return
			}

			const howManyMessages = (args[1].toLowerCase() === "all")
				? "Infinity" // lol
				: parseInt(args[1])
		
			if (isNaN(howManyMessages)) {
				message.channel.send(embeds.error(`Not a number: ${args[1]}`))
					.then(log.error)
				return
			}

			// Resolve a starting message and a promise for an ending message
			message.channel.send(embeds.standard(`Scraping up to ${howManyMessages} messages from [${channel.guild.name} - #${channel.name}]...`))
				.then(log.say)


			try {
				const messagesAdded = await scrape(channel, howManyMessages)
				message.channel.send(embeds.standard(`Added ${messagesAdded} messages.`))
					.then(log.say)
			}
			catch (err) {
				logError(err)
				message.channel.send(embeds.error(err))
					.then(log.error)
			}
		}


		, imitate: async () => {
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
						userID = mentionToUserID(args[0]) || await markov.randomUserID()
				}
			} else {
				userID = await markov.randomUserID()
			}

			// Schism can't imitate herself
			if (userID === client.user.id) {
				message.channel.send(embeds.xok)
					.then(log.xok)
				return
			}

			imitate(userID, message.channel)
		}


		, embed: () => {
			if (!admin || !args[0]) return
			message.channel.send(embeds.standard(args.join(" ")))
				.then(log.say)
		}


		, error: () => {
			if (!admin || !args[0]) return
			message.channel.send(embeds.error(args.join(" ")))
				.then(log.error)
		}


		, xok: () => {
			if (!admin) return
			message.channel.send(embeds.xok)
				.then(log.xok)
		}


		, code: () => {
			message.channel.send(embeds.code)
				.then(log.say)
		}


		// Command aliases using getters: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
		, get github() { return this.code }
		, get source() { return this.code }


		, save: async () => {
			if (!admin) return
			const force = args[0] === "all"

			message.channel.send(embeds.standard((force) ? "Saving all corpi..." : "Saving..."))
			try {
				const savedCount = await corpusUtils.saveAll(force)
				message.channel.send(embeds.standard(log.save(savedCount)))
					.then(log.say)
			} catch (err) {
				logError(err.stack)
				message.channel.send(embeds.error(err))
					.then(log.error)
			}
		}


		, servers: () => {
			const embed = new Discord.RichEmbed()
				.setTitle("Member of these servers:")

			client.guilds.tap(server => {
				embed.addField(server.name, server.id, true)
			})

			message.channel.send(embed)
				.then(console.log(`${location(message)} Listed servers to ${message.author.tag}.`))
		}


		, speaking: () => {
			if (!args[0]) {
				message.channel.send(embeds.error(`Missing server ID\nSyntax: ${config.PREFIX}speaking [server ID]`))
					.then(log.error)
				return
			}

			const guild = client.guilds.get(args[0])
			if (!guild) {
				message.channel.send(embeds.error("Invalid server ID"))
					.then(log.error)
			}
			const embed = new Discord.RichEmbed()
				.setTitle(`${guild.name} (ID: ${guild.id})`)
				.setDescription("Can speak in these channels")

			guild.channels.tap(channel => {
				if (canSpeakIn(channel.id))
					embed.addField(`#${channel.name}`, channel.id, true)
			})

			message.channel.send(embed)
				.then(console.log(`${location(message)} Listed speaking channels for ${guild.name} (ID: ${guild.id}) to ${message.author.tag}.`))
		}


		, learning: () => {
			if (!args[0]) {
				message.channel.send(embeds.error(`Missing server ID\nSyntax: ${config.PREFIX}learning [server ID]`))
					.then(log.error)
				return
			}

			const guild = client.guilds.get(args[0])
			if (!guild) {
				message.channel.send(embeds.error("Invalid server ID"))
					.then(log.error)
			}
			const embed = new Discord.RichEmbed()
				.setTitle(`${guild.name} (ID: ${guild.id})`)
				.setDescription("Learning in these channels")

			guild.channels.tap(channel => {
				if (learningIn(channel.id))
					embed.addField(`#${channel.name}`, channel.id, true)
			})

			message.channel.send(embed)
				.then(console.log(`${location(message)} Listed learning channels for ${guild.name} (ID: ${guild.id}) to ${message.author.tag}.`))
		}
	}

	// Execute the corresponding command from the commands dictionary
	commands[command]()

	return command
}


/**
 * Set the custom nicknames from config.
 * 
 * @return {Promise<void>} nothing
 * @rejects {Error[]} array of errors
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
 * The chance that Schism will choose to respond to a mundane message.
 * 
 * @return {Boolean} True/false
 */
function blurtChance() {
	return Math.random() * 100 <= 0.05 // 0.05% chance
}


/**
 * Get status name from a status code.
 * 
 * @param {number} code - status code
 * @return {string} status name
 */
function status(code) {
	return ["Playing", "Streaming", "Listening", "Watching"][code]
}


/**
 * Get a user ID from a mention string (e.g. <@120957139230597299>.
 * 
 * Pings start with <@, end with >, and do NOT contain :'s.
 * Not containing :'s is important since emojis do.
 * 
 * @param {string} mention - string with a user ID
 * @return {?string} userID
 */
function mentionToUserID(mention) {
	const mentionPattern = /<@((?!:).)[0-9]*>/g
	const idPattern = /[0-9]/

	return (mentionPattern.test(mention))
		? mention.match(idPattern)[0]
		: null
}


/**
 * Is [val] in [obj]?
 * 
 * @param {any} val
 * @param {Object} object
 * @return {Boolean}
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
 * DM all the users in the ADMINS envrionment variable.
 * 
 * @param {string} string - message to send the admins
 */
function dmTheAdmins(string) {
	for (const key in config.ADMINS) {
		const userId = config.ADMINS[key]
		client.fetchUser(userId)
			.then(user => user.send(string))
			.catch(console.error)
	}
}


/**
 * DM the admins and log an error.
 * 
 * @param {string} err - error message
 */
function logError(err) {
	console.error(err)
	const sendThis = (err.message)
		? `ERROR! ${err.message}`
		: `ERROR! ${err}`

	dmTheAdmins(sendThis)
}


/**
 * HTTPS download a file from a URL.
 * Written to only be used once which is why it directly requires https lol
 * 
 * @param {string} url - URL to download the file from
 * @return {string} response from server
 */
function httpsDownload(url) {
	return new Promise( (resolve, reject) => {
		require("https").get(url, res => {
			if (res.statusCode === 200) {
				let data = ""
				res.setEncoding("utf8")
				res.on("data", chunk => data += chunk)
				res.on("end", () => resolve(data))
			} else {
				reject(`Failed to download URL: ${url}`)
			}
		})
	})
}


/**
 * Check for bad words in a string.
 * 
 * @param {string} phrase - String to check for bad words in
 * @return {Boolean} Whether the string contains any bad words
 */
function isNaughty(phrase) {
	if (!config.BAD_WORDS) return false

	function _wordIsBad(word) {
		return config.BAD_WORDS.includes(word)
	}

	phrase = phrase.replace(/[^A-z]/g, "") // Only acknowledge letters
	const words = phrase.split(" ") // Split into an array of words
	return words.some(_wordIsBad) // Returns true if any word is bad, false if none are bad
}


/**
 * Turn this:
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
 * Generate an object containing stats about
 *   all the channels in the given dictionary.
 * 
 * @param {Object} channelDict - Dictionary of channels
 * @return {Promise<Object>} Object intended to be console.table'd
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
 * @return {Promise<Object>} Object intended to be console.table'd
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
 * Generate a string that tells where the message came from
 *   based on a Discord Message object.
 * 
 * @param {Message} message - message object, like from channel.send() or on-message
 * @return {string} location string
 * @example
 *     console.log(location(message))
 *     // returns "[Server - #channel]"
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
