import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import * as embeds from "../../modules/embeds";
import { Command } from "discord.js-commando";


export default class LearningCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "learning",
            memberName: "learning",
            aliases: ["learningchannels", "learning_channels", "learningin", "learning_in"],
			group: "data",
            description: "Show the channels within this server where Parrot will collect registered users' messages.",
            throttling: {
                usages: 2,
                duration: 10,
            },
		});
    }
    

    run(message: CommandoMessage): null {
        if (message.channel.type === "text") {
            message.embed(embeds.learningIn(message.channel.guild));
        } else {
            message.say("This command is not available in DMs.");
        }
        return null;
    }
};
