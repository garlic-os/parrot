import { Message } from "discord.js";
import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { firstOf } from "../../modules/utils";
import { client } from "../../app";
import { Command } from "discord.js-commando";


interface ShutdownCommandArguments {
    delay: number;
};


export default class ShutdownCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "shutdown",
			memberName: "shutdown",
			aliases: ["stop", "halt"],
			group: "maintenance",
            description: "Shut down the bot.",
            details: "Bot will commit `process.exit()`.",
            format: `${process.env.COMMAND_PREFIX}shutdown [delay]`,
            args: [
                {
                    key: "delay",
                    prompt: "Wait this many milliseconds before shutting down.",
                    default: 0,
                    type: "integer",
                },
            ],
            ownerOnly: true,
		});
    }
    

    async run(message: CommandoMessage, { delay }: ShutdownCommandArguments): Promise<Message> {
        let output = "Shutting down";
        output += (delay > 0) ?
            ` in ${delay} milliseconds...` :
            "...";

        const messages = await message.say(output);
        client.emit("warn", output);

        setTimeout( () => {
            client.destroy();
            process.exit();
        }, delay);

        return firstOf(messages);
    }
};
