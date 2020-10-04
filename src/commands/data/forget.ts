import type { User } from "discord.js";
import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import { colors } from "../../modules/colors";
import { corpusManager } from "../../app";

const prefix = process.env.COMMAND_PREFIX;


interface ForgetCommandArguments {
    user: User;
}


export default class ForgetCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "forget",
			memberName: "forget",
			group: "data",
            description: "Delete your data from Parrot.",
            details: "Without this data, Parrot will not be able to imitate you. Note: this does not unregister you from Parrot.",
            throttling: {
                usages: 2,
                duration: 10,
            },
            args: [
                {
                    key: "user",
                    prompt: 'Forget this user (for yourself, use "me").',
                    type: "userlike",
                },
            ],
		});
    }
    

    run(message: CommandoMessage, { user }: ForgetCommandArguments): null {
        // Only Parrot's owner can make Parrot forget other users.
        if (message.author !== user && !this.client.isOwner(message.author)) {
            message.embed({
                title: "Verboten",
                color: colors.red,
                description: "You may not make Parrot forget anyone but yourself.",
            });
            return null;
        }

        corpusManager.delete(message.author.id);

        message.embed({
            title: `Forgot ${user.tag}.`,
            color: colors.gray,
            description: `${user.username}'s data has been deleted from Parrot's datastore. Parrot will not be able to imitate this user until they post more messages or do \`${prefix}quickstart\` again.`,
        });
        return null;
    }
};
