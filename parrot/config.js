const dotenv = require("dotenv").config();

// If something goes wrong with dotenv, use process.env instead
const envVars = dotenv.parsed || process.env;


// Load environment variables to config.
// JSON parse any value that is JSON-parse-able.
const config = require("./defaults");
for (const key in envVars) {
	try {
		config[key] = JSON.parse(envVars[key]);
	} catch (e) {
		config[key] = envVars[key];
	}
}

module.exports = config;
