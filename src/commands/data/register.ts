import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import { corpusManager } from "../../app";
import { registrationSuccess } from "../../modules/embeds";


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
        message.embed(registrationSuccess);
        return null;
    }
};
