"use strict"

const RichEmbed = require("discord.js").RichEmbed
const embedColors = (process.env.EMBED_COLORS)
						? JSON.parse(process.env.EMBED_COLORS)
						: require("./defaults").EMBED_COLORS


module.exports = {
	/**
	 * Generate a Discord Rich Embed object out of the supplied information
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
	 * Generate a Discord Rich Embed object out of the supplied information
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
	 * Only made once because it's always the same
	 */
	xok: new RichEmbed()
			.attachFiles(["./img/xok.png"])
			.setColor(embedColors.error)
			.setTitle("Error")
			.setImage("attachment://xok.png")
}
