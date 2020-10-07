import type { ParrotPurpl } from "../../modules/parrot-purpl";
import type { Message, User } from "discord.js";
import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { chainManager } from "../../app";
import { webhookManager } from "../../app";
import { colors } from "../../modules/colors";
import * as embeds from "../../modules/embeds";
import * as utils from "../../modules/utils";
import { Command } from "discord.js-commando";

const prefix = process.env.COMMAND_PREFIX;

interface ImitateCommandArguments {
    user: User;
    startword: string;
}


const sendImitationMessage = async (message: CommandoMessage, user: User, text: string): Promise<Message> => {
    const nickname = await utils.resolveNickname(user, message.channel);
    const webhook = webhookManager.get(message.channel.id);

    // The funny ternary operator
    const messages = (webhook) ? (
        await webhook.send(text, {
            username: "(Parrot)" + nickname,
            avatarURL: user.displayAvatarURL(),
        })
    ) : (
        // Fallback text mode for when a Webhook isn't
        //   available in the given channel.
        await message.embed({
            author: {
                name: "(Parrot)" + nickname,
                iconURL: user.displayAvatarURL(),
            },
            color: colors.purple,
            description: text,
        })
    );
    
    return utils.firstOf(messages);
};


const run = async (message: CommandoMessage, user: User, startword: string): Promise<Message> => {
    let chain: ParrotPurpl;
        try {
            chain = await chainManager.get(user.id);

        } catch (err) {
            if (err.code === "NOTREG") {
                const messages = await message.embed(embeds.notRegistered);
                return utils.firstOf(messages);
            }
            else if (err.code === "NODATA") {
                const messages = await message.embed(embeds.noData(user));
                return utils.firstOf(messages);
            }
            throw err;
        }

        const sentenceCount = ~~(Math.random() * 4 + 1); // 1-5 sentences
        chain.config.grams = ~~(Math.random() * 2 + 1); // State size 1-3
        chain.config.from = startword;

        let phrase = "";

        for (let i = 0; i < sentenceCount; ++i) { // haha ++i
            try {
                phrase += chain.generate() + " ";
            } catch (err) {
                if (err.code !== "DREWBLANK") {
                    throw err;
                }
                const messages = await message.embed(embeds.errorMessage(err));
                return utils.firstOf(messages);
            }
            chain.config.from = "";
        }

        return sendImitationMessage(message, user, phrase);
};


export default class ImitateCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "imitate",
			memberName: "imitate",
			aliases: ["parrot"],
			group: "text",
            description: "Make Parrot imitate someone.",
            details: "Parrot will use a Markov Chain constructed from this user's recorded message history to create a new message that sounds like it came from them.",
            format: `${prefix}imitate [user] [startword]`,
            examples: [
                `\`${prefix}imitate @TheLegend27\``,
                `\`${prefix}imitate @TheLegend27 according\``,
                `\`${prefix}imitate me\``,
            ],
            throttling: {
                usages: 2,
                duration: 10,
            },
            args: [
                {
                    key: "user",
                    prompt: 'Mention a user for Parrot to imitate (shortcut: use "me" for yourself)',
                    type: "userlike",
                },
                {
                    key: "startword",
                    prompt: "Start the message with this word, if possible.",
                    type: "string",
                    default: "",
                },
            ],
		});
    }
    

    async run(message: CommandoMessage, { user, startword }: ImitateCommandArguments): Promise<Message> {
        message.channel.startTyping();
        try {
            return await run(message, user, startword);
        } catch (err) {
            throw err;
        } finally {
            message.channel.stopTyping();
        }
    }
};
