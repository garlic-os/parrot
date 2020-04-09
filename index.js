// Permissions code: 67584
// Send messages, read message history

const config = require("./schism/config")


// Log errors when in production; crash when not in production
if (config.NODE_ENV === "production") {
	process.on("unhandledRejection", logError)
} else {
	process.on("unhandledRejection", up => { throw up })
}

// Overwrite console methods with empty ones and don't require
//   console-stamp if logging is disabled
if (config.DISABLE_LOGS) {
	for (const method in console) {
		console[method] = () => {}
	}
} else {
	require("console-stamp")(console, {
		datePrefix: "",
		dateSuffix: "",
		pattern: " "
	})
}


// Only allow console.debug() when DEBUG env var is set
if (!config.DEBUG) {
	console.debug = () => {}
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
		hook: hookRes => console.log(`${location(hookRes)} Imitated ${hookRes.author.username.substring(4)} (ID: ${hookRes.author.id}), saying: ${hookRes.content}`)
	}
  , forget:  ([message, user]) => console.log(`${location(message)} Forgot user ${user.tag} (ID: ${user.id}).`)
  , error:   message => console.log(`${location(message)} Sent the error message: ${message.embeds[0].fields[0].value}`)
  , xok:     message => console.log(`${location(message)} Sent the XOK message.`)
  , help:    message => console.log(`${location(message)} Sent the Help message.`)
  , save:    count   => `Saved ${count} ${(count === 1) ? "corpus" : "corpora"}.`
  , pinged:  message => console.log(`${location(message)} Pinged by ${message.author.tag} (ID: ${message.author.id}).`)
  , command: message => console.log(`${location(message)} Received a command from ${message.author.tag} (ID: ${message.author.id}): ${message.content}`)
  , blurt:   message => console.log(`${location(message)} Randomly decided to imitate ${message.author.tag} (ID: ${message.author.id}) in response to their message.`)
}


// Lots of consts
const Discord     = require("discord.js")
const corpusUtils = require("./schism/corpus")
const embeds      = require("./schism/embeds")
const help        = require("./schism/help")
const regex       = require("./schism/regex")

const hookSendQueue = []
const hooks = parseHooksDict(config.HOOKS)

const client   = new Discord.Client({disableEveryone: true})
const learning = require("./schism/learning")(client, corpusUtils)
const markov   = require("./schism/markov")(corpusUtils)


// (Hopefully) save before shutting down
process.on("SIGTERM", async () => {
	console.info("Saving changes...")
	const savedCount = await corpusUtils.saveAll()
	console.info(log.save(savedCount))
})


// --- LISTENERS ---------------------------------------------

client.on("ready", () => {
	console.info(`Logged in as ${client.user.tag} (ID: ${client.user.id}).\n`)
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
	   && !message.webhookID // Not a Webhook
	   && message.author.id !== client.user.id) { // Not self

	   if (canSpeakIn(channelID) // Channel is listed in SPEAKING_CHANNELS or is a DM channel
		  || message.channel.type === "dm") {

			// Ping
			if (message.isMentioned(client.user) // Mentioned
			&& !message.content.includes(" ")) { // Has no spaces (i.e. contains nothing but a ping))
				log.pinged(message)
				//message.channel.startTyping()
				const userID = await randomUserID(message.guild)
				await imitate(userID, message.channel)
				//message.channel.stopTyping()
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
			learning.learnFrom(message)
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
	dmTheAdmins(embed)
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
 * @param {Boolean} intimidateMode - when true, put message in **BOLD ALL CAPS**
 * @return {Promise}
 */
async function imitate(userID, channel, intimidateMode) {
	if (channel.guild) {
		// Channel is a part of a guild and the user may have
		//   a nickname there, so use .fetchMember
		const member = await channel.guild.fetchMember(userID)
		avatarURL = member.user.displayAvatarURL
		name = member.displayName
	} else {
		const user = await client.fetchUser(userID)
		avatarURL = user.displayAvatarURL
		name = user.username
	}

	let sentence = await markov(userID)
	sentence = await disablePings(sentence)

	let namePrefix = "Not "

	if (intimidateMode) {
		sentence = "**" + discordCaps(sentence) + "**"
		name = name.toUpperCase()
		namePrefix = namePrefix.toUpperCase()
	}

	const hook = hooks[channel.id]
	if (hook) {
		// Only change appearance if the current user to imitate
		//   is different from the last user Schism imitated
		if (hook.name !== name) {
			name = namePrefix + name
			await hook.edit({
				name: name,
				avatar: avatarURL
			})
		}

		hookSendQueue.push([hook, sentence])
		return
	} else {
		avatarURL = avatarURL.replace("?size=2048", "?size=64")
		channel.send(`${name}​ be like:\n${sentence}\n${avatarURL}`)
			.then(message => log.imitate.text([message, name, sentence]))
	}
}


/**
 * Turn everything caps, except emojis.
 * Contributed by Kaylynn. Thank you, Kaylynn!
 * 
 * Leaves URLs and emojis unaffected so that they
 *   will still work normally.
 * 
 * @param {string} sentence - sentence to mostly capitalize
 * @return {string} mostly capitalized string
 */
function discordCaps(sentence) {
	const pattern = regex.doNotCapitalize

    sentence = sentence.replace(/\*/g, "").split(" ")
    const output = []
	for (const word of sentence) {
		if (pattern.test(word)) {
			output.push(word)
		} else {
			output.push(word.toUpperCase())
		}
	}

    return output.join(" ")
}


/**
 * Parse <@6813218746128746>-type mentions into @user#1234-type mentions.
 * This way, mentions won't actually ping any users.
 * 
 * @param {string} sentence - sentence to disable pings in
 * @return {Promise<string>} sentence that won't ping anyone
 */
async function disablePings(sentence) {
	return await _replaceAsync(sentence, regex.mention, async mention => {
		const userID = mention.match(regex.id)[0]
		try {
			const user = await client.fetchUser(userID)
			return "@" + user.tag
		} catch (err) {
			console.error(`_disablePings() error. mention: ${mention}. userID: ${userID}.`, err)
			return ""
		}
	})
}


/**
 * An asynchronous version of String.prototype.replace().
 * Created by Overcl9ck on StackOverflow:
 * https://stackoverflow.com/a/48032528
 * 
 * @param {string} str - string to run the function on
 * @param {RegExp} regex - match to this regular expression
 * @param {Function} asyncFn - function to be invoked to replace the matches to [regex]
 * @return {string} string with matches to [regex] processed by [asyncFn]
 */
async function _replaceAsync(str, regex, asyncFn) {
    const promises = []
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args)
        promises.push(promise)
    })
    const data = await Promise.all(promises)
    return str.replace(regex, () => data.shift())
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
	let command = args.shift().toLowerCase()

	const caller = message.author
	const admin = isAdmin(caller.id)

	let intimidateMode = false

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
					caller.send(embeds.error("Don't ask questions you aren't prepared to handle the asnwers to."))
						.then(log.error)
					return
				} else {
					embed.addField(args[0], help[args[0]].desc + "\n" + help[args[0]].syntax)
				}
			// All commands
			} else {
				for (const [command, properties] of Object.entries(help)) {
					if (!(properties.admin && !admin)) { // If the user is not an admin, do not show admin-only commands
						embed.addField(command, properties.desc + "\n" + properties.syntax)
					}
				}
			}
			caller.send(embed) // DM the user the help embed instead of putting it in chat since it's kinda big
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
			//message.channel.startTyping()

			let userID = args[0]

			if (args[0]) {
				// If args[0] is "me", use the sender's ID.
				// Otherwise, if it is a number, use it as an ID.
				// If it can't be a number, maybe it's a <@ping>. Try to convert it.
				// If it's not actually a ping, use a random ID.
				if (args[0].toLowerCase() === "me") {
					userID = caller.id
				} else {
					if (isNaN(args[0])) {
						userID = mentionToUserID(args[0]) || await randomUserID(message.guild)
					}
				}
			} else {
				userID = await randomUserID(message.guild)
			}

			// Schism can't imitate herself
			if (userID === client.user.id) {
				message.channel.send(embeds.xok)
					.then(log.xok)
				return
			}

			try {
				await imitate(userID, message.channel, intimidateMode)
			} catch (err) {
				const msg = err.message || err
				message.channel.send(embeds.error(msg))
			}

			//message.channel.stopTyping()
		}


		, forget: async () => {
			let userID = mentionToUserID(args[0])

			// Specified a user to forget and that user isn't their self
			if (userID && userID !== caller.id) {
				if (admin) {
					userID = mentionToUserID(userID)
				} else {
					message.channel.send(embeds.error("Only admins can force-forget other users."))
						.then(log.error)
					return
				}
			} else { // No user specified
				userID = caller.id
			}

			try {
				const user = await client.fetchUser(userID)
				corpusUtils.forget(userID)
				message.channel.send(embeds.standard(`Forgot user ${user.tag}.`))
					.then(() => log.forget([message, user]))
				dmTheAdmins(`Forgot user ${user.tag} (ID: ${user.id}).`)
			} catch (err) {
				logError(err)
				message.channel.send(embeds.error(err))
					.then(log.error)
			}
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

			message.channel.send(embeds.standard((force) ? "Saving all corpora..." : "Saving..."))
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
			if (!admin) return

			const embed = new Discord.RichEmbed()
				.setTitle("Member of these servers:")

			client.guilds.tap(server => {
				embed.addField(server.name, server.id, true)
			})

			message.author.send(embed)
				.then(console.log(`${location(message)} Listed servers to ${caller.tag}.`))
		}


		, speaking: () => {
			if (!admin) return

			if (!args[0]) {
				message.author.send(embeds.error(`Missing server ID\nSyntax: ${config.PREFIX}speaking [server ID]`))
					.then(log.error)
				return
			}

			const guild = client.guilds.get(args[0])
			if (!guild) {
				message.author.send(embeds.error("Invalid server ID"))
					.then(log.error)
			}
			const embed = new Discord.RichEmbed()
				.setTitle(`${guild.name} (ID: ${guild.id})`)
				.setDescription("Can speak in these channels")

			guild.channels.tap(channel => {
				if (canSpeakIn(channel.id)) {
					embed.addField(`#${channel.name}`, channel.id, true)
				}
			})

			message.author.send(embed)
				.then(console.log(`${location(message)} Listed speaking channels for ${guild.name} (ID: ${guild.id}) to ${message.author.tag}.`))
		}


		, learning: () => {
			if (!admin) return

			if (!args[0]) {
				message.author.send(embeds.error(`Missing server ID\nSyntax: ${config.PREFIX}learning [server ID]`))
					.then(log.error)
				return
			}

			const guild = client.guilds.get(args[0])
			if (!guild) {
				message.author.send(embeds.error("Invalid server ID"))
					.then(log.error)
			}
			const embed = new Discord.RichEmbed()
				.setTitle(`${guild.name} (ID: ${guild.id})`)
				.setDescription("Learning in these channels")

			guild.channels.tap(channel => {
				if (learningIn(channel.id)) {
					embed.addField(`#${channel.name}`, channel.id, true)
				}
			})

			message.author.send(embed)
				.then(console.log(`${location(message)} Listed learning channels for ${guild.name} (ID: ${guild.id}) to ${caller.tag}.`))
		}
	}

	// Special case modifier for |imitate
	if (command === "intimidate") {
		intimidateMode = true
		command = "imitate"
	}

	// Execute the corresponding command from the commands dictionary
	if (Object.keys(commands).includes(command)) {
		commands[command]()
	}

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

	if (errors.length > 0) {
		throw errors
	} else {
		return
	}
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
	return (regex.mention.test(mention))
		? mention.match(regex.id)[0]
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
		if (obj[i] === val) {
			return true
		}
	}
	return false
}


function isAdmin(userID) {
	return has(userID, config.ADMINS)
}


function isBanned(userID) {
	return has(userID, config.BANNED)
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
		const hook = new Discord.WebhookClient(hookID, token, {disableEveryone: true})
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
	
	if (isEmpty(channelDict)) {
		throw "No channels are whitelisted."
	}

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
	
	if (isEmpty(nicknameDict)) {
		throw "No nicknames defined."
	}

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
		if (obj.hasOwnProperty(key)) {
			return false
		}
	}
	return true
}


/**
 * Choose a random user ID that Schism can imitate.
 * 
 * @param {Guild} guild - Guild from which to choose a random user
 * @return {Promise<string>} userID
 */
async function randomUserID(guild) {
	const userIDs = await corpusUtils.allUserIDs()
	let tries = 0
	while (++tries < 100) {
		const index = ~~(Math.random() * userIDs.size - 1)
		const userID = elementAt(userIDs, index)
		try {
			await guild.fetchMember(userID) // Make sure the user in is this server
			return userID
		} catch (e) {
			console.debug(`  [DEBUG]   randomUserID() error ${userID}`)
		} // The user doesn't exist; loop and *try* again
	}
	throw `randomUserID(): Failed to find a userID after ${tries} attempts`
}


/**
 * Get an element from a Set.
 * 
 * @param {Set} setObj - Set to get the element from
 * @param {number} index - position of element in the Set
 * @return ?{any} [index]th element in the Set
 */
function elementAt(setObj, index) {
	if (index < 0 || index > setObj.size - 1) {
		return // Index out of range; return undefined
	}
	const iterator = setObj.values()
	for (let i=0; i<index-1; ++i) {
		// Increment the iterator index-1 times.
		// The iterator value after this one is the element we want.
		iterator.next()
	}

	return iterator.next().value
}

// --- /FUNCTIONS -------------------------------------------
