const prefix = require("./config").PREFIX;

module.exports = {
	help: {
		admin: false,
		desc: `Help.`,
		syntax: `${prefix}help`
	}

	, imitate: {
		admin: false,
		desc: `Imitate yourself.`,
		syntax: `${prefix}imitate`
	}

	, intimidate: {
		admin: false,
		desc: `**IMITATE YOURSELF.**`,
		syntax: `${prefix}intimidate`
	}

	, save: {
		admin: true,
		desc: `Upload unsaved cache to S3.`,
		syntax: `${prefix}save ["all"]`
	}

	, scrape: {
		admin: true,
		desc: `Save [goal] number of messages in [channel].`,
		syntax: `${prefix}scrape <[channelID|"here"]> <[goal|"all"]>`
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
		admin: true,
		desc: `List all the servers Parrot is a member of.`,
		syntax: `${prefix}servers`
	}

	, channels: {
		admin: true,
		desc: `List the visible text channels in a server Parrot is in.`,
		syntax: `${prefix}channels <serverID>`
	}

	, speaking: {
		admin: true,
		desc: `List all the channels of a server that Parrot can speak in.`,
		syntax: `${prefix}speaking <serverID>`
	}

	, learning: {
		admin: true,
		desc: `List all the channels of a server that Parrot is learning from.`,
		syntax: `${prefix}learning <serverID>`
	}

	, code: {
		admin: false,
		desc: `Get information on how to find Parrot on GitHub.`,
		syntax: `${prefix}[code|github|source]`
	}

	, forget: {
		admin: false,
		desc: `Remove your data from Parrot.`,
		syntax: `${prefix}forget`
	}

	, terms: {
		admin: false,
		desc: `View Parrot's Terms of Service.`,
		syntax: `${prefix}terms`
	}

	, agree: {
		admin: false,
		desc: `Agree to Parrot's Terms of Service.`,
		syntax: `${prefix}agree`
	}

	, disagree: {
		admin: false,
		desc: `Disagree to Parrot's Terms of Service (Parrot will not be able to imitate you).`,
		syntax: `${prefix}disagree`
	},
};
