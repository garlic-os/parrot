import * as errorHandler from "./modules/error-handler";
import { config } from "./config";
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

// Load the .env file, if supplied.
dotenv.config();

// Irresponsibly export the Client instance.
export const client = new CommandoClient({
	commandPrefix: config.commandPrefix,
    owner: config.owners,
    disableMentions: "all",
    presence: {
        activity: {
            name: `everyone (${config.commandPrefix}help)`,
            type: "LISTENING",
        },
    },
});

// Export instances of the Managers to be used globally.
export const corpusManager = new CorpusManager(config.corpusDir);
export const chainManager = new ChainManager(config.cacheSize);
export const webhookManager = new WebhookManager();

// Add event listeners from /src/listeners/.
registerListeners(client);

// Start the bot.
client.login(config.discordBotToken);

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
