"use strict"

const prefix = process.env.prefix || require("./defaults").prefix

module.exports = {
	help: {
		admin: false,
		desc: `Help.`,
		syntax: `${prefix}help`
	}

	, imitate: {
		admin: false,
		desc: `Imitate a user.`,
		syntax: `${prefix}imitate <ping a user>`
	}

	, save: {
		admin: true,
		desc: `Upload all unsaved cache to S3.`,
		syntax: `${prefix}save`
	}

	, scrape: {
		admin: true,
		desc: `Save [howManyMessages] messages in [channel].`,
		syntax: `${prefix}scrape <channelID> <howManyMessages>`
	}

	, embed: {
		admin: true,
		desc: `Generate an embed.`,
		syntax: `${prefix}embed <message>`
	}

	, error: {
		admin: true,
		desc: `Generate an error embed.`,
		syntax: `${prefix}error <message>`
	}

	, xok: {
		admin: true,
		desc: `Xok`,
		syntax: `${prefix}xok`
	}

	, servers: {
		admin: false,
		desc: `List all the servers Schism is a member of.`,
		syntax: `${prefix}servers`
	}

	, speaking: {
		admin: false,
		desc: `List all the channels of a server that Schism can speak in.`,
		syntax: `${prefix}speaking <serverID>`
	}

	, learning: {
		admin: false,
		desc: `List all the channels of a server that Schism is learning from.`,
		syntax: `${prefix}learning <serverID>`
	}
}
