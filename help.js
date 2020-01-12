"use strict"

const prefix = process.env.PREFIX || require("./defaults").PREFIX

module.exports = {
	help: {
		admin: false,
		desc: `Help.`,
		syntax: `${prefix}help`
	},
	imitate: {
		admin: false,
		desc: `Imitate a user.`,
		syntax: `${prefix}imitate <ping a user>`
	},
	save: {
		admin: true,
		desc: `Upload all unsaved cache to S3.`,
		syntax: `${prefix}save`
	},
	scrape: {
		admin: true,
		desc: `Save [howManyMessages] messages in [channel].`,
		syntax: `${prefix}scrape <channelID> <howManyMessages>`
	},
	embed: {
		admin: true,
		desc: `Generate an embed.`,
		syntax: `${prefix}embed <message>`
	},
	error: {
		admin: true,
		desc: `Generate an error embed.`,
		syntax: `${prefix}error <message>`
	},
	xok: {
		admin: true,
		desc: `Xok`,
		syntax: `${prefix}xok`
	},
	filter: {
		admin: true,
		desc: `Removes "undefined" from the beginning of any given corpi that have it.\nIf no list is given, a list of all corpi will be used instead.`,
		syntax: `${prefix}filter [space-delimited list of user IDs]`
	}
}
