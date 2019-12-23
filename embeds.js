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
				avatarURL = client.user.avatarURL
				name = userId
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
