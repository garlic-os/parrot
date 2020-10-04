import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import { colors } from "../../modules/colors";
import { corpusManager } from "../../app";

const prefix = process.env.COMMAND_PREFIX;


export default class RegisterCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "register",
			memberName: "register",
			group: "data",
            description: "Register to let Parrot imitate you.",
            details: "By registering, you agree to Parrot's privacy policy.",
            throttling: {
                usages: 2,
                duration: 4,
            },
		});
    }
    

    run(message: CommandoMessage): null {
        corpusManager.userRegistry.add(message.author.id);

        message.embed({
            title: "Registered!",
            color: colors.green,
            description: "Now Parrot can start learning your speech patterns and imitate you.",
            fields: [
                {
                    name: "Tip:",
                    value: "If this is your first time registering (or if you deleted your data recently), you might want to consider running the \`quickstart\` command to immediately give Parrot a dataset to imitate you from. This will scan your past messages to create a model of how you speak, so you can start using Parrot right away.",
                    inline: false,
                },
            ],
            footer: {
                text: `${prefix}quickstart`,
            },
        });
        return null;
    }
};
