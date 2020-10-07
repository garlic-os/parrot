import * as errorHandler from "./modules/error-handler";
import { verifyEnvVars } from "./modules/verify-env-vars";
import { ChainManager } from "./modules/chain-manager";
import { CorpusManager } from "./modules/corpus-manager";
import { WebhookManager } from "./modules/webhook-manager";
import { registerListeners } from "./modules/register-listeners";

import * as dotenv from "dotenv";
import * as path from "path";
import { CommandoClient } from "discord.js-commando";

// Globally route all uncaught errors to this function.
process.on("unhandledRejection", errorHandler.handleError);
process.on("uncaughtException", errorHandler.handleError);

// Load the .env file and make sure all the required environment
//   variables are accounted for.
dotenv.config();
verifyEnvVars(process.env);

// Irresponsibly export the Client instance.
export const client = new CommandoClient({
	commandPrefix: process.env.COMMAND_PREFIX,
    owner: "206235904644349953",
    disableMentions: "all",
    presence: {
        activity: {
            name: `everyone (${process.env.COMMAND_PREFIX}help)`,
            type: "LISTENING",
        },
    },
});

// Export instances of the Managers to be used globally.
export const corpusManager = new CorpusManager(path.join(__dirname, "../corpora/"));
export const chainManager = new ChainManager(parseInt(<string>process.env.CACHE_SIZE));
export const webhookManager = new WebhookManager();

// Add event listeners from /src/listeners/.
registerListeners(client);

// Start the bot.
client.login(process.env.DISCORD_BOT_TOKEN);

// Modified version of the default filter to also pick up .ts files.
// Probably won't run into .ts files in production but pretty
//   useful for developing with ts-node.
const filetypeFilter = /^([^\.].*)\.((js(on)?)|ts)$/;

// Register the commands and their dependent types and groups.
client.registry
    .registerDefaultTypes()
    .registerTypesIn({
        dirname: path.join(__dirname, "@command-types"),
        filter: filetypeFilter,
    })
	.registerGroups([
        ["maintenance", "Bot Maintenance"],
		["text", "Text Shenanigans"],
		["data", "Your Data"],
	])
	.registerDefaultGroups()
	.registerDefaultCommands()
    .registerCommandsIn({
        dirname: path.join(__dirname, "commands"),
        filter: filetypeFilter,
    });
