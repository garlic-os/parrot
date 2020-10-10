import type { User } from "discord.js";
import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import * as embeds from "../../modules/embeds";
import { corpusManager } from "../../app";


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
    

    async run(message: CommandoMessage, { user }: ForgetCommandArguments): Promise<null> {
        // If the user to forget is not the one sending the command,
        //   make sure the user sending the command is an owner first.
        if (message.author !== user && !this.client.isOwner(message.author)) {
            message.embed(embeds.forgetPermissionDenied);
            return null;
        }

        if (await corpusManager.has(user.id)) {
            corpusManager.delete(user.id);
            message.embed(embeds.forgot(user));
        } else {
            message.embed(embeds.noData(user));
        }

        return null;
    }
};
