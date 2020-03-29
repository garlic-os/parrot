const defaults = {
	PREFIX: "|",
	EMBED_COLORS: {
		"normal": "#A755B5",
		"error": "#FF3636"
	},
	SPEAKING_CHANNELS: {},
	LEARNING_CHANNELS: {},
	NICKNAMES: {},
	ADMINS: {},
	BANNED: {},
	DISABLE_LOGGING: false,
	HOOKS: {}
}


// Load environment variables to config.
// JSON parse any value that is JSON-parse-able.
const config = defaults
for (const key in process.env) {
	try {
		config[key] = JSON.parse(process.env[key])
	} catch (e) {
		config[key] = process.env[key]
	}
}

module.exports = config
