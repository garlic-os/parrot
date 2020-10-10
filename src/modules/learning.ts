import type { Snowflake, Message } from "discord.js";
import { corpusManager } from "../app";
import { config } from "../config";
import * as regex from "./regex";
import * as utils from "./utils";


// A message must pass all of these checks before
//   Parrot can learn from it.
const validateMessage = (message: Message): boolean => {
    const { channel, content } = message;
    return (
        // Text content not empty.
        content.length > 0 &&

        // Not a Parrot command.
        !content.startsWith(config.commandPrefix) &&

        // Only learn in text channels, not DMs.
        message.channel.type === "text" &&

        // Lot of other bots' commands start with non-alphanumeric characters,
        //   so if a message starts with one other than a known Markdown
        //   character or special Discord character, Parrot should just avoid it
        //   because it's probably a command.
        (
            regex.markdown.test(content[0]) ||
            regex.discordStringBeginning.test(content[0]) ||
            utils.isAlphaNumeric(content[0])
        ) &&

        // Don't learn from bots.
        !message.author.bot &&

        // Don't learn from Webhooks.
        !message.webhookID &&

        // Parrot must be allowed to learn in this channel.
        config.learningChannels.hasOwnProperty(channel.id)
    );
};


export const learnFrom = (messages: Message | Message[]): number => {
    if (!(messages instanceof Array)) {
        messages = [messages];
    }

    const user = messages[0].author;

    // Every message in the array must have the same author, because the
    //   Corpus Manager adds every message passed to it at the same time to
    //   the same user.
    if (!messages.every(message => message.author.id === user.id)) {
        throw {
            name: "Too many authors",
            code: "ERRTMA",
            message: "Every message in an array passed into learnFrom() must have the same author",
        };
    }

    // Only keep messages that pass all of validateMessage()'s checks
    messages = messages.filter(validateMessage);

    // Add these messages to this user's corpus.
    try {
        corpusManager.add(user.id, messages);
    } catch (err) {
        // If the user isn't registered, that's OK; just don't learn from
        //   this message.
        if (err.code === "NOTREG") {
            return -1;
        } else {
            throw err;
        }
    }

    // Log results.
    if (messages.length === 1) {
        console.log(`Collected a message from ${user.tag}`);
    } else {
        console.log(`Collected ${messages.length} messages from ${user.tag}`);
    }

    return messages.length;
};
