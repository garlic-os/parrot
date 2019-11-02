const Discord = require("discord.js")

module.exports = (embedColors, name) => {
	return {
		/**
		 * Generates a Discord Rich Embed object out of the supplied information
		 * 
		 * @param {User} str - messages to print
		 * @return {RichEmbed} Discord Rich Embed object
		 */
		standard: (str) => {
			return new Discord.RichEmbed()
				.setColor(embedColors.normal)
				.addField(name, str)
		},


		/**
		 * Generates a Discord Rich Embed object out of the supplied information
		 * 
		 * @param {User} user - Shows this user's avatar and nickname
		 * @param {string} quote - Shows this text
		 * @param {Channel} channel - User's nickname is fetched from this channel
		 * @return {RichEmbed} Discord Rich Embed object
		 */
		imitate: (user, quote, channel) => {
			// Use nickname, unless something goes wrong, then use username
			const username = channel.guild.fetchMember(user.id).displayName || user.username
			return new Discord.RichEmbed()
				.setColor(embedColors.normal)
				.setThumbnail(user.displayAvatarURL)
				.addField(username, quote)
		},

		/**
		 * Generates a Discord Rich Embed object out of the supplied information
		 * 
		 * @param {string} err - Error to print
		 * @return {RichEmbed} Discord Rich Embed object
		 */
		error: (err) => {
			return new Discord.RichEmbed()
				.setColor(embedColors.error)
				.addField("Error", err)
		},


		xok: () => {
			return new Discord.RichEmbed()
				.attachFiles(["./img/xok.png"])
				.setColor(embedColors.error)
				.setTitle("Error")
				.setImage("attachment://xok.png")
		}
	}
}
