"use strict"

const { RichEmbed } = require("discord.js")

const embedColors = (process.env.EMBED_COLORS)
	? JSON.parse(process.env.EMBED_COLORS)
	: require("./defaults").EMBED_COLORS



/**
 * Generate a Discord Rich Embed message.
 * 
 * @param {string} str - message to print
 * @return {RichEmbed} Discord Rich Embed object
 */
function standard(str) {
	return new RichEmbed()
		.setColor(embedColors.normal)
		.addField("Schism", str)
}


/**
 * Generate a Discord Rich Embed error message.
 * 
 * @param {string} err - Error to print
 * @return {RichEmbed} Discord Rich Embed object
 */
function error(err) {
	return new RichEmbed()
		.setColor(embedColors.error)
		.addField("Error", err)
}


/**
 * A joke embed with xok.
 * Only made once since it's always the same.
 */
const xok = new RichEmbed()
	.attachFiles(["./img/xok.png"])
	.setColor(embedColors.error)
	.setTitle("Error")
	.setImage("attachment://xok.png")


module.exports = {
	standard: standard,
	error: error,
	xok: xok
}
