const fs = require("fs");
const { RichEmbed } = require("discord.js");
const config = require("./config");
const colors = config.EMBED_COLORS;
const prefix = config.PREFIX;

/**
 * Generate a Discord Rich Embed message.
 * 
 * @param {string} str - message to print
 * @param {DiscordUser} author? - (optional) author to assign to the embed
 * @return {RichEmbed} Discord Rich Embed object
 */
function standard(str, author) {
	const embed = new RichEmbed()
		.setColor(colors.normal)
		.setDescription(str);

	if (author) {
		embed.setAuthor(author.tag, author.avatarURL);
	}

	return embed;
}


function consent(user) {
	return new RichEmbed()
		.setColor(colors.normal)
		.setAuthor(user.tag, user.avatarURL)
		.setTitle(`${user.tag}, did you agree to Parrot's Terms of Service?`)
		.setDescription(`View the full Terms of Service with \`${prefix}terms\`, then make your decision with \`${prefix}agree\` or \`${prefix}disagree\`.`)
		.setFooter("Parrot keeps your messages to gain an impression of how you speak. You must agree to the Terms of Service before Parrot can imitate you.");
}


function agree(user) {
	return new RichEmbed()
		.setColor(colors.normal)
		.setAuthor(user.tag, user.avatarURL)
		.setDescription("You have agreed to Parrot's Terms of Service. You can now make Parrot imitate you!")
		.setFooter(`View the full Terms of Service: ${prefix}terms • Revoke consent: ${prefix}disagree`);
}


function disagree(user) {
	return new RichEmbed()
		.setColor(colors.normal)
		.setAuthor(user.tag, user.avatarURL)
		.setDescription("You have disagreed to Parrot's Terms of Service. Parrot will no longer be able to imitate you.")
		.setFooter(`View the full Terms of Service: ${prefix}terms • Restore consent: ${prefix}agree`);
}


function confirmForget(caller, forgetee) {
	const self = caller.id === forgetee.id;
	return new RichEmbed()
		.setColor(colors.normal)
		.setAuthor(caller.tag, caller.avatarURL)
		.setTitle(`Are you sure you want Parrot to forget ${self ? "you" : `**${forgetee.tag}**`}?`)
		.setDescription(`To confirm, do \`${prefix}confirmforget${self ? "" : ` @${forgetee.username}`}\` within the next 30 seconds.`)
		.setFooter(`${self ? "Your" : "This user's"} data will be permanently erased from Parrot's servers.`);

}


function confirmationExpired(caller, forgetee) {
	const self = caller.id === forgetee.id;
	return new RichEmbed()
		.setColor(colors.normal)
		.setAuthor(caller.tag, caller.avatarURL)
		.setTitle("No pending confirmation")
		.setDescription(`There is no pending confirmation for you to delete ${self ? "your" : `**${forgetee.tag}**'s`} data. This means that either the confirmation window has expired, or that you have never requested for Parrot to forget ${self ? "you" : `**${forgetee.tag}**`}.`);
}


function forgot(caller, forgetee) {
	return new RichEmbed()
		.setColor(colors.normal)
		.setAuthor(caller.tag, caller.avatarURL)
		.setTitle(`Forgot **${forgetee.tag}**.`)
		.setDescription(`This user's data has been permanently erased from Parrot's servers.`);
}


/**
 * Generate a Discord Rich Embed error message.
 * 
 * @param {string} err - Error to print
 * @return {RichEmbed} Discord Rich Embed object
 */
function error(err) {
	return new RichEmbed()
		.setColor(colors.error)
		.setDescription(err);
}


/**
 * A joke embed with xok.
 * Only made once since it's always the same.
 */
const xok = new RichEmbed()
	.attachFiles(["./img/xok.png"])
	.setColor(colors.error)
	.setTitle("Error")
	.setImage("attachment://xok.png");


/**
 * A pre-made embed with information on how to find
 *   Parrot on GitHub.
 */
const code = new RichEmbed()
	.setTitle("Parrot is open source!")
	.addField("View the code, file issues, and make pull requests to help improve Parrot.", "https://github.com/the-garlic-os/parrot")
	.setFooter("Please help me. I'm begging you.");


/**
 * A pre-made embed containing Parrot's Terms of Service.
 */
const terms = new RichEmbed()
	.setTitle("Parrot's Terms of Service")
	.setDescription(fs.readFileSync("./terms-of-service.txt")); // Yes, this will break if it pushes the embed over 6,000 characters


module.exports = {
	standard,
	consent,
	agree,
	disagree,
	forgot,
	confirmForget,
	confirmationExpired,
	error,
	xok,
	code,
	terms,
};
