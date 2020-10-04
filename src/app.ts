import * as errorHandler from "./modules/error-handler";
import { verifyEnvVars } from "./modules/verify-env-vars";
import { ChainManager } from "./modules/chain-manager";
import { CorpusManager } from "./modules/corpus-manager";
import { WebhookManager } from "./modules/webhook-manager";
import { registerListeners } from "./modules/register-listeners";

import * as dotenv from "dotenv";
import * as path from "path";
import { CommandoClient } from "discord.js-commando";

// Route all uncaught errors from any file to this function
process.on("unhandledRejection", errorHandler.handleError);
process.on("uncaughtException", errorHandler.handleError);

dotenv.config();
verifyEnvVars(process.env);

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

export const corpusManager = new CorpusManager(path.join(__dirname, "../corpora/"));
export const chainManager = new ChainManager(parseInt(<string>process.env.CACHE_SIZE));
export const webhookManager = new WebhookManager();

registerListeners(client);

client.login(process.env.DISCORD_BOT_TOKEN);

// Modified version of the default filter to also pick up .ts files.
// Probably won't run into .ts files in production but pretty
//   useful for developing with ts-node.
const filetypeFilter = /^([^\.].*)\.((js(on)?)|ts)$/;

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
