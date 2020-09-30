import { Message, TextChannel, User } from "discord.js";
import type {
    CommandoClient,
    CommandoMessage
} from "discord.js-commando";


import { chainManager } from "../../app";
import { webhookManager } from "../../app";
import { Command } from "discord.js-commando";
import { colors } from "../../modules/colors";



// Coerce a string into a Discord User. Accepts:
// - a user mention, like <@95723409575203346>.
// - a user ID, like 95723409575203346.
// - an empty string; will return the message author.
// - the string "me"; will return the message author.
// TODO: Make this into a Commando Argument Type.
const parseUserMention = async (text: string, message: CommandoMessage): Promise<User> => {
    if (text === "") {
        // TODO: Maybe make this pick a random user instead?
        return message.author;
    }
    if (text === "me") {
        return message.author;
    }
    // Strip a mention down to the ID.
    const userID = text.replace(/[^\d]/g, "");

    if (message.channel instanceof TextChannel) {
        const { user } = await message.guild.members.fetch(userID);
        return user;
    } else {
        return message.channel.recipient;
    }
}


const resolveNickname = async (user: User, message: CommandoMessage): Promise<string> => {
    if (message.channel.type === "text") {
        const member = await message.channel.guild.members.fetch(user.id);
        if (member) {
            return member.nickname || user.username;
        } else {
            console.debug("[*] Imitated a user who is not in this server. This is not supposed to happen.");
            return user.username;
        }
    } else {
        return user.username;
    }
};


const firstOf = (thing: any | any[]): any => {
    if (thing instanceof Array) {
        return thing[0];
    }
    return thing;
};


const sendImitationMessage = async (text: string, user: User, message: CommandoMessage): Promise<Message> => {
    const nickname = await resolveNickname(user, message);

    const webhook = webhookManager.get(message.channel.id);
    if (webhook) {
        const messages = await webhook.send(text, {
            username: nickname,
            avatarURL: user.displayAvatarURL(),
        });
        return firstOf(messages);
    } else {
        // Fallback text mode for when a Webhook isn't
        //   available in the given channel.
        const messages = await message.embed({
            author: {
                name: nickname,
                iconURL: user.displayAvatarURL(),
            },
            color: colors.purple,
            description: text,
        });
        return firstOf(messages);
    }
};


module.exports = class ImitateCommand extends Command {
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
                `${process.env.COMMAND_PREFIX}imitate @TheLegend27`,
                `${process.env.COMMAND_PREFIX}imitate me`,
            ],
            throttling: {
                usages: 2,
                duration: 10,
            },
            args: [
                {
                    key: "user",
                    prompt: 'Mention a user for Parrot to imitate (shortcut: use "me" for yourself)',
                    default: "",
                    parse: parseUserMention,
                },
            ],
		});
    }
    

    async run(message: CommandoMessage, user: User): Promise<Message> {
        const chain = chainManager.get(user.id);

        if (!chain) {
            const messages = await message.embed({
                color: colors.red,
                title: "Error",
                description: `No data available for user ${user.tag}`,
            });
            return firstOf(messages);
        }

        const sentenceCount = ~~(Math.random() * 4 + 1); // 1-5 sentences
        chain.config.grams = ~~(Math.random() * 2 + 1); // State size 1-3

        let phrase = "";

        for (let i = 0; i < sentenceCount; ++i) {
            let addition = "";
            do {
                addition = chain.generate();
            } while (!addition);
    
            phrase += addition;
        }

        return sendImitationMessage(phrase, user, message);
    }
};
