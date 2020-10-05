import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import { corpusManager } from "../../app";
import { unregistrationSuccess } from "../../modules/embeds";


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
        message.embed(unregistrationSuccess);
        return null;
    }
};
