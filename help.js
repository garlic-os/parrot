const prefix = process.env.PREFIX

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
	}
}