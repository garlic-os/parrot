import * as errorHandler from "./modules/error-handler";
import { verifyEnvVars } from "./modules/verify-env-vars";
import { ChainManager } from "./modules/chain-manager";
import { CorpusManager } from "./modules/corpus-manager";
import { WebhookManager } from "./modules/webhook-manager";

import * as dotenv from "dotenv";
import * as path from "path";
import { CommandoClient } from "discord.js-commando";

// Route all uncaught errors throughout every file to this function
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

export const corpusManager = new CorpusManager();
export const chainManager = new ChainManager();
export const webhookManager = new WebhookManager();

client.registry
	.registerDefaultTypes()
	.registerGroups([
		["text", "Text Shenanigans"],
		//["data", "Your Data"],
	])
	.registerDefaultGroups()
	.registerDefaultCommands()
    .registerCommandsIn(path.join(__dirname, "commands"));


client.once("ready", () => {
    if (client.user) {
        console.log(`Logged in as ${client.user.tag}! (User ID: ${client.user.id})`);
    } else {
        errorHandler.handleError("This is never supposed to happen: the client have a user property");
    }
});

client.on("error", errorHandler.handleError);


client.login(process.env.DISCORD_BOT_TOKEN);
