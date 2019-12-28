"use strict"

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
				.addField("Schism", str)
		},


		/**
		 * Generates a Discord Rich Embed object out of the supplied information
		 * 
		 * @param {string} userID - Shows this user's avatar and nickname
		 * @param {string} sentence - Shows this text
		 * @param {Channel} channel - User's nickname is fetched from this channel
		 * @return {RichEmbed} Discord Rich Embed object
		 */
		imitate: async (userID, sentence, channel) => {
			let avatarURL
			let name

			try {
				// Try to get the information from the server the user is in,
				// so that Schism can use the user's nickname.
				const member = await channel.guild.fetchMember(userID)
				avatarURL = member.user.displayAvatarURL
				name = member.displayName
			} catch (err) {
				// If Schism can't get the user from the server,
				// use the user's ID for their name
				// and the default avatar.
				avatarURL = "https://discordapp.com/assets/322c936a8c8be1b803cd94861bdfa868.png"
				name = userID
			}

			// discord.js automatically brings back a huge, 2048px image link.
			// The thumbnail space Schism is going to put the image in isn't that big;
			// it'll just waste bandwidth. This makes it so that a smaller version of
			// the image is requested instead.
			avatarURL = avatarURL.replace("?size=2048", "?size=256")

			const embed = new RichEmbed()
				.setColor(embedColors.normal)
				.setThumbnail(avatarURL)
				.addField(name, sentence)
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
