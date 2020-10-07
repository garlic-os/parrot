import type { Message } from "discord.js";
import { corpusManager } from "../app";
import { config } from "../../config";
import * as utils from "./utils";

let prevTag: string = "";
let collectedCount: number = 1;


// A message must pass all of these checks before
//   Parrot can learn from it.
const validateMessage = (message: Message): boolean => {
    const { channel, content } = message;
    return (
        // Text content not empty.
        content.length > 0 &&

        // Not a Parrot command.
        !content.startsWith(<string>process.env.COMMAND_PREFIX) &&

        // Lot of other bots' commands start with non-alphanumeric
        //   characters, so if a message starts with one, Parrot
        //   should just avoid it because it's probably a command.
        utils.isAlphaNumeric(content[0]) &&

        // Don't learn from bots.
        !message.author.bot &&

        // Don't learn from Webhooks.
        !message.webhookID &&

        // Parrot must be allowed to learn in this channel.
        config.learningChannels.hasOwnProperty(channel.id)
    );
};


export const learnFrom = (message: Message): boolean => {
    if (validateMessage(message)) {
        if (prevTag === message.author.tag) {
            if (collectedCount++ === 1) {
                utils.consoleUpdate(`Collected a message from ${message.author.tag}`);
            } else {
                utils.consoleUpdate(`Collected ${collectedCount} messages from ${message.author.tag}`);
            }
        } else {
            console.log(`Collected a message from ${message.author.tag}`);
            collectedCount = 1;
        }


        corpusManager.add(message.author.id, message);
        return true;
    }

    return false;
};
