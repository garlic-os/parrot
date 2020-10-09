import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import { corpusManager } from "../../app";
import * as embeds from "../../modules/embeds";


export default class RegistrationStatusCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "registrationstatus",
            memberName: "registrationstatus",
            aliases: ["registration_status", "registration", "status", "checkregistration", "check_registration"],
			group: "data",
            description: "Check if you're registered with Parrot.",
            details: "You need to be registered for Parrot to be able to monitor your messages and imitate you. By registering, you agree to Parrot's privacy policy.",
            throttling: {
                usages: 2,
                duration: 4,
            },
		});
    }
    

    run(message: CommandoMessage): null {
        if (corpusManager.userRegistry.has(message.author.id)) {
            message.embed(embeds.youAreRegistered);
        } else {
            message.embed(embeds.youAreNotRegistered);
        }
        return null;
    }
};
