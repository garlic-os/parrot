import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import * as embeds from "../../modules/embeds";
import { Command } from "discord.js-commando";


export default class SpeakingCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "speaking",
            memberName: "speaking",
            aliases: ["speakingchannels", "speaking_channels", "speakingin", "speaking_in"],
			group: "data",
            description: "Show the channels within this server that Parrot can speak in.",
            throttling: {
                usages: 2,
                duration: 10,
            },
		});
    }
    

    run(message: CommandoMessage): null {
        if (message.channel.type === "text") {
            message.embed(embeds.speakingIn(message.channel.guild));
        } else {
            message.say("This command is not available in DMs.");
        }
        return null;
    }
};
