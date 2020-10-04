import { MessageCollector, Message } from "discord.js";
import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import { corpusManager } from "../../app";
import { colors } from "../../modules/colors";
import * as utils from "../../modules/utils";


export default class QuickstartCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "quickstart",
			memberName: "quickstart",
			group: "data",
            description: "Scan your past messages to get started using Parrot right away.",
            details: "This command is only available to users with fewer than 20 messages in Parrot's datastore.",
            throttling: {
                usages: 1,
                duration: 60,
            },
            guildOnly: true,
		});
    }
    

    async run(message: CommandoMessage): Promise<null> {
        const messages = await message.embed({
            title: "Scanning...",
            color: colors.blue,
        });
        const statusEmbed = utils.firstOf(messages);

        // Only collect messages from the user who sent the command
        const filter = (collectedMessage: Message): boolean => {
            return message.author === collectedMessage.author;
        };

        const options = {
            max: 1000, // Maybe 10000?
        };

        // Start collecting messages
        const messageCollector = new MessageCollector(message.channel, filter, options);

        // Periodically update the embed that Parrot sent to show
        //   how many messages have been collected so far.
        const editLoop = setInterval( () => {
            statusEmbed.edit(null, {
                title: "Scanning...",
                color: colors.blue,
                description: `Collected ${messageCollector.collected.size} messages...`,
            }); 
        }, 2000);

        // Add each collected message to the user's corpus.
        messageCollector.on("collect", (collectedMessage: Message) => {
            corpusManager.add(message.author.id, collectedMessage.content);
        });

        // Edit the embed one last time to show that it's done,
        //   and stop the loop that updates progress.
        messageCollector.once("end", () => {
            clearInterval(editLoop);
            statusEmbed.edit(null, {
                title: "Scan complete",
                color: colors.green,
                description: `Collected ${messageCollector.collected.size} messages.`,
            });
        });

        return null;
    }
};
