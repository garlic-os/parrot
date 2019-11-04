const Discord = require("discord.js")

module.exports = embedColors => {
	return {
		/**
		 * Generates a Discord Rich Embed object out of the supplied information
		 * 
		 * @param {User} str - messages to print
		 * @return {RichEmbed} Discord Rich Embed object
		 */
		standard: str => {
			return new Discord.RichEmbed()
				.setColor(embedColors.normal)
				.addField(process.env.NAME, str)
		},


		/**
		 * Generates a Discord Rich Embed object out of the supplied information
		 * 
		 * @param {string} userId - Shows this user's avatar and nickname
		 * @param {string} quote - Shows this text
		 * @param {Channel} channel - User's nickname is fetched from this channel
		 * @return {RichEmbed} Discord Rich Embed object
		 */
		imitate: (userId, quote, channel) => {
			return new Promise( (resolve, reject) => {
				channel.guild.fetchMember(userId).then(member => {
					resolve(new Discord.RichEmbed()
						.setColor(embedColors.normal)
						.setThumbnail(member.user.displayAvatarURL)
						.addField(member.displayName, quote)
					)
				})
				.catch(reject)
			})
		},

		/**
		 * Generates a Discord Rich Embed object out of the supplied information
		 * 
		 * @param {string} err - Error to print
		 * @return {RichEmbed} Discord Rich Embed object
		 */
		error: err => {
			return new Discord.RichEmbed()
				.setColor(embedColors.error)
				.addField("Error", err)
		},


		xok: new Discord.RichEmbed()
			.attachFiles(["./img/xok.png"])
			.setColor(embedColors.error)
			.setTitle("Error")
			.setImage("attachment://xok.png")
	}
}
