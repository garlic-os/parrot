
// Reusable log messages
module.exports = {
	  say:     message => console.log(`${location(message)} Said: ${message.embeds[0].fields[0].value}`)
	, imitate: {
		text: ([ message, name, sentence ]) => console.log(`${location(message)} Imitated ${name}, saying: ${sentence}`),
		hook: hookRes => console.log(`${location(hookRes)} Under the name "${hookRes.author.username}", said: ${hookRes.content}`)
	}
	, error:   message => console.log(`${location(message)} Sent the error message: ${message.embeds[0].fields[0].value}`)
	, xok:     message => console.log(`${location(message)} Sent the XOK message.`)
	, help:    message => console.log(`${location(message)} Sent the Help message.`)
	, save:    count   => console.log(`Saved ${count} ${(count === 1) ? "corpus" : "corpi"}.`)
	, pinged:  message => console.log(`${location(message)} Pinged by ${message.author.tag}.`)
	, command: message => console.log(`${location(message)} Received a command from ${message.author.tag}: ${message.content}`)
	, blurt:   message => console.log(`${location(message)} Randomly decided to imitate someone in response to ${message.author.tag}'s message.`)
	, learned: message => console.log(`${location(message)} Learned from ${message.author.tag}:`, buffer)
	, 
	
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
	channelTable: async (channelDict) => {
		if (config.DISABLE_LOGS)
			return {}
		
		if (isEmpty(channelDict))
			throw "No channels are whitelisted."

		const stats = {}
		for (const i in channelDict) {
			const channelID = channelDict[i]
			const channel = client.channels.get(channelID)
			const stat = {}
			stat["Server"] = channel.guild.name
			stat["Name"] = "#" + channel.name
			stats[channelID] = stat
		}
		return stats
	},


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
	nicknameTable: async (nicknameDict) => {
		if (config.DISABLE_LOGS)
			return {}
		
		if (isEmpty(nicknameDict))
			throw "No nicknames defined."

		const stats = {}
		for (const serverName in nicknameDict) {
			const [ serverID, nickname ] = nicknameDict[serverName]
			const server = client.guilds.get(serverID)
			const stat = {}
			stat["Server"] = server.name
			stat["Intended"] = nickname
			stat["De facto"] = server.me.nickname
			stats[serverID] = stat
		}
		return stats
	},


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
	userTable: async (userIDs) => {
		if (config.DISABLE_LOGS)
			return {}
		
		if (!userIDs || userIDs.length === 0)
			throw "No user IDs defined."

		// If userIDs a single value, wrap it in an array
		if (!Array.isArray(userIDs)) userIDs = [userIDs]

		const stats = {}
		for (const userID of userIDs) {
			const user = await client.fetchUser(userID)
			const stat = {}
			stat["Username"] = user.tag
			stats[userID] = stat
		}
		return stats
	}
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
