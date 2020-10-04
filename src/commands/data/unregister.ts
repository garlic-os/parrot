import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import { colors } from "../../modules/colors";
import { corpusManager } from "../../app";

const prefix = process.env.COMMAND_PREFIX;


export default class UnregisterCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "unregister",
			memberName: "unregister",
			group: "data",
            description: "Remove your registration from Parrot.",
            details: "Parrot will not be able to imitate you until you register again, and Parrot will stop collecting your messages.",
            throttling: {
                usages: 2,
                duration: 4,
            },
		});
    }
    

    run(message: CommandoMessage): null {
        corpusManager.userRegistry.delete(message.author.id);

        message.embed({
            title: "Unregistered!",
            color: colors.gray,
            description: `Parrot will no longer be able to imitate you, and it has stopped collecting your messages.\n\n_If you're done with Parrot and don't want it to have your messages anymore, or if you just want a fresh start, you can do \`${prefix}forget me\` and your data will be permanently deleted from Parrot's datastore._`,
        });
        return null;
    }
};
