import type { Message } from "discord.js";
import { corpusManager } from "../app";
import { config } from "../config";
import { ParrotError } from "./parrot-error";
import * as regex from "./regex";
import * as utils from "./utils";


// A message must pass all of these checks before
//   Parrot can learn from it.
export const validateMessage = (message: Message): boolean => {
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


// Add a Message or array of Messages to a user's corpus.
// Every Message in the array must be from the same user.
// You can also skip the validation check if you want, but of course make sure
//   you know what you're doing if you do that.
// (That advice is unsolicited. I do not know what I am doing.)
export const learnFrom = async (messages: Message | Message[], skipValidation: boolean=false): Promise<number> => {
    if (!(messages instanceof Array)) {
        messages = [messages];
    }

    const user = messages[0].author;

    // Every message in the array must have the same author, because the
    //   Corpus Manager adds every message passed to it at the same time to
    //   the same user.
    if (!messages.every(message => message.author.id === user.id)) {
        throw new ParrotError({
            name: "Too many authors",
            code: "ERRTMA",
            message: "Every message in an array passed into learnFrom() must have the same author",
        });
    }

    // Only keep messages that pass all of validateMessage()'s checks.
    if (!skipValidation) {
        messages = messages.filter(validateMessage);
    }

    // Add these messages to this user's corpus.
    try {
        await corpusManager.add(user.id, messages);
    } catch (err) {
        // If the user isn't registered, that's OK; just don't learn from
        //   this message.
        if (err.code === "NOTREG") {
            return -1;
        } else {
            throw err;
        }
    }

    return messages.length;
};
