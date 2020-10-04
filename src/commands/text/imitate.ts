import type { Message, User } from "discord.js";
import type { CommandoClient, CommandoMessage } from "discord.js-commando";
import type { ParrotPurpl } from "../../modules/parrot-purpl";

import { chainManager } from "../../app";
import { webhookManager } from "../../app";
import { colors } from "../../modules/colors";
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
            username: nickname,
            avatarURL: user.displayAvatarURL(),
        })
    ) : (
        // Fallback text mode for when a Webhook isn't
        //   available in the given channel.
        await message.embed({
            author: {
                name: nickname,
                iconURL: user.displayAvatarURL(),
            },
            color: colors.purple,
            description: text,
        })
    );
    
    return utils.firstOf(messages);
};


export default class ImitateCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "imitate",
			memberName: "imitate",
			aliases: ["parrot"],
			group: "text",
            description: "Make Parrot imitate the target user.",
            details: "Parrot will use a Markov Chain constructed from this user's recorded message history to create a new message that sounds like it came from them.",
            format: `${process.env.COMMAND_PREFIX}imitate [user]`,
            examples: [
                `\`${process.env.COMMAND_PREFIX}imitate @TheLegend27\``,
                `\`${process.env.COMMAND_PREFIX}imitate me\``,
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
                    default: "",
                    type: "string",
                },
            ],
		});
    }
    

    run(message: CommandoMessage, { user, startword }: ImitateCommandArguments): null {
        let chain: ParrotPurpl;
        // Sheesh this part is messy
        try {
            chain = chainManager.get(user.id);
        } catch (err) {
            if (err.code === "NOTREG") {
                const notRegisteredText = `You aren't registered with Parrot yet. You need to do that before Parrot can collect your messages or imitate you.
To get started, read the privacy policy (\`${prefix}policy\`) then register with \`${prefix}register\`.`;
                message.embed({
                    title: "Whoa, sod buster!",
                    color: colors.red,
                    description: notRegisteredText,
                    footer: {
                        text: `If you believe this message was received in error, please contact ${this.client.owners[0].tag}`,
                    },
                });
                return null;
            } else if (err.code === "NODATA") {
                message.embed({
                    title: "who are you",
                    color: colors.red,
                    description: `No data available for user ${user.tag}`,
                    footer: {
                        text: `If you believe this message was received in error, please contact ${this.client.owners[0].tag}`,
                    },
                });
                return null;
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
                message.embed({
                    color: colors.red,
                    title: "Error",
                    description: err.message,
                });
                return null;
            }
            chain.config.from = "";
        }

        sendImitationMessage(message, user, phrase);
        return null;
    }
};
