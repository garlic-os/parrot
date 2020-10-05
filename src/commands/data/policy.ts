import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import { policy } from "../../modules/embeds";


export default class PolicyCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "policy",
			memberName: "policy",
			aliases: ["privacy_policy", "privacypolicy", "privacy", "terms_of_service", "termsofservice", "tos", "terms", "eula"],
			group: "data",
            description: "View Parrot's privacy policy.",
            details: "Parrot collects the message history of registered users to imitate them. Learn more about Parrot's data collection practices here.",
            throttling: {
                usages: 2,
                duration: 4,
            },
		});
    }
    

    run(message: CommandoMessage): null {
        message.embed(policy);
        return null;
    }
};
