const RichEmbed = require("discord.js").RichEmbed

module.exports = embedColors => {
	return {
		/**
		 * Generates a Discord Rich Embed object out of the supplied information
		 * 
		 * @param {User} str - messages to print
		 * @return {RichEmbed} Discord Rich Embed object
		 */
		standard: str => {
			return new RichEmbed()
				.setColor(embedColors.normal)
				.addField("Bipolar", str)
		},


		/**
		 * Generates a Discord Rich Embed object out of the supplied information
		 * 
		 * @param {string} userId - Shows this user's avatar and nickname
		 * @param {string} quote - Shows this text
		 * @param {Channel} channel - User's nickname is fetched from this channel
		 * @return {RichEmbed} Discord Rich Embed object
		 */
		imitate: async (userId, quote, channel) => {
			let avatarURL
			let name

			try {
				// Try to get the information from the server the user is in,
				// so that Bipolar can use the user's nickname.
				const member = await channel.guild.fetchMember(userId)
				avatarURL = member.user.displayAvatarURL
				name = member.displayName
			} catch (err) {
				// If Bipolar can't get the user from the server,
				// use the user's ID for their name
				// and Bipolar's own profile picture.
				avatarURL = "https://discordapp.com/assets/322c936a8c8be1b803cd94861bdfa868.png"
				name = userId
			}

			avatarURL = avatarURL.replace("?size=2048", "?size=256")

			if (process.env.PLAIN_TEXT) {
				avatarURL = avatarURL.replace("?size=256", "?size=64")
				for (const word of quote.split(" ")) {
					const inTextUserId = mentionToUserId(word)
					if (inTextUserId) {
						const inTextMember = await channel.guild.fetchMember(inTextUserId)
						quote = quote.replace(word, `@${inTextMember.user.tag}`)
					}
				}
				return `${name} be like:\n_${quote}_\n${avatarURL}`
			}

			const embed = new RichEmbed()
				.setColor(embedColors.normal)
				.setThumbnail(avatarURL)
				.addField(name, quote)
			return embed
		},

		/**
		 * Generates a Discord Rich Embed object out of the supplied information
		 * 
		 * @param {string} err - Error to print
		 * @return {RichEmbed} Discord Rich Embed object
		 */
		error: err => {
			return new RichEmbed()
				.setColor(embedColors.error)
				.addField("Error", err)
		},


		/**
		 * A joke embed with xok
		 * 
		 * Only made once at startup because it's always the same
		 */
		xok: new RichEmbed()
			.attachFiles(["./img/xok.png"])
			.setColor(embedColors.error)
			.setTitle("Error")
			.setImage("attachment://xok.png")
	}
}


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
