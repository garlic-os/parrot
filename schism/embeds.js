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


/**
 * A pre-made embed with information on how to find
 *   Schism on GitHub.
 */
const code = new RichEmbed()
	.setTitle("Schism is open source!")
	.addField("View the code, file issues, and make pull requests to help improve Schism.", "https://github.com/Grosserly/schism")
	.setFooter("Please help me. I'm begging you.")


module.exports = {
	standard,
	error,
	xok,
	code
}
