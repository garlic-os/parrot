import { Message, User } from "discord.js";
import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { chainManager } from "../../app";
import { webhookManager } from "../../app";
import { Command } from "discord.js-commando";
import { colors } from "../../modules/colors";
import * as utils from "../../modules/utils";


interface ImitateCommandArguments {
    user: User;
    startword: string;
}


const sendImitationMessage = async (text: string, user: User, message: CommandoMessage): Promise<Message> => {
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
    

    async run(message: CommandoMessage, { user, startword }: ImitateCommandArguments): Promise<Message> {
        const chain = chainManager.get(user.id);

        if (!chain) {
            const messages = await message.embed({
                color: colors.red,
                title: "Error",
                description: `No data available for user ${user.tag}`,
            });
            return utils.firstOf(messages);
        }

        const sentenceCount = ~~(Math.random() * 4 + 1); // 1-5 sentences
        chain.config.grams = ~~(Math.random() * 2 + 1); // State size 1-3
        chain.config.from = startword;

        let phrase = "";

        for (let i = 0; i < sentenceCount; ++i) { // haha ++i
            let sentence = "";
            // We have to expect to try multiple times to get valid output
            //   from .generate() because sometimes it returns an empty
            //   string.
            do {
                sentence = chain.generate();
            } while (!sentence);
    
            phrase += sentence;

            chain.config.from = "";
        }

        return sendImitationMessage(phrase, user, message);
    }
};
