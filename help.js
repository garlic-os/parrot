"use strict"

const { PREFIX } = process.env || require("./defaults")

module.exports = {
	help: {
		admin: false,
		desc: `Help.`,
		syntax: `${PREFIX}help`
	}

	, imitate: {
		admin: false,
		desc: `Imitate a user.`,
		syntax: `${PREFIX}imitate <ping a user>`
	}

	, save: {
		admin: true,
		desc: `Upload all unsaved cache to S3.`,
		syntax: `${PREFIX}save`
	}

	, scrape: {
		admin: true,
		desc: `Save [howManyMessages] messages in [channel].`,
		syntax: `${PREFIX}scrape <channelID> <howManyMessages>`
	}

	, embed: {
		admin: true,
		desc: `Generate an embed.`,
		syntax: `${PREFIX}embed <message>`
	}

	, error: {
		admin: true,
		desc: `Generate an error embed.`,
		syntax: `${PREFIX}error <message>`
	}

	, xok: {
		admin: true,
		desc: `Xok`,
		syntax: `${PREFIX}xok`
	}

	, servers: {
		admin: false,
		desc: `List all the servers Schism is a member of.`,
		syntax: `${PREFIX}servers`
	}

	, speaking: {
		admin: false,
		desc: `List all the channels of a server that Schism can speak in.`,
		syntax: `${PREFIX}speaking <serverID>`
	}

	, learning: {
		admin: false,
		desc: `List all the channels of a server that Schism is learning from.`,
		syntax: `${PREFIX}learning <serverID>`
	}
}
