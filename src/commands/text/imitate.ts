import type { ImitateCommandArguments } from "../..";
import type { ParrotPurpl } from "../../modules/parrot-purpl";
import type { User } from "discord.js";
import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { chainManager } from "../../app";
import { webhookManager } from "../../app";
import { colors } from "../../modules/colors";
import { config } from "../../config";
import * as embeds from "../../modules/embeds";
import * as utils from "../../modules/utils";
import { Command } from "discord.js-commando";
import { ParrotEmbed } from "../../modules/parrot-embed";

const prefix = config.commandPrefix;


const sendImitationMessage = async (message: CommandoMessage, user: User, text: string, intimidateMode: boolean): Promise<null> => {
    const webhook = webhookManager.get(message.channel.id);

    let nickname = await utils.resolveNickname(user, message.channel);
    let namePrefix = "(Parrot) ";

    // When inimitate mode is enabled (through the intimidate command),
    //   capitalize the message and wrap it in bold Markdown.
    if (intimidateMode) {
        text = "**" + utils.discordCaps(text) + "**";
        nickname = nickname.toUpperCase();
        namePrefix = namePrefix.toUpperCase();
    }

    if (webhook) {
        await webhook.send(text, {
            username: namePrefix + nickname,
            avatarURL: user.displayAvatarURL(),
        });
     } else {
        // Fallback text mode for when a Webhook isn't
        //   available in the given channel.
        await message.embed({
            author: {
                name: namePrefix + nickname,
                iconURL: user.displayAvatarURL(),
            },
            color: colors.purple,
            description: text,
        });
     }
    
    return null;
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
    

    async run(message: CommandoMessage, { user, startword }: ImitateCommandArguments, intimidateMode: boolean=false): Promise<null> {
        let chain: ParrotPurpl;
        try {
            chain = await chainManager.get(user.id);

        } catch (err) {
            if (err.code === "NOTREG") {
                let embed: ParrotEmbed;
                if (message.author.id === user.id) {
                    embed = embeds.notRegisteredMe;
                } else {
                    embed = embeds.notRegistered;
                }
                message.embed(embed);
                return null;
            }
            if (err.code === "NODATA") {
                message.embed(embeds.noData(user));
                return null;
            }
            if (err instanceof SyntaxError) {
                // Failed to JSON-parse corpus
                message.embed(embeds.corpusCorrupt(user));
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
                message.embed(embeds.errorMessage(err));
                return null;
            }
            chain.config.from = "";
        }

        sendImitationMessage(message, user, phrase, intimidateMode);
        return null;
    }
}
