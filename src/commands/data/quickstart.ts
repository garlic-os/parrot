import type { Corpus } from "../..";
import type { Collection, Snowflake } from "discord.js";
import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Message } from "discord.js";
import { Command } from "discord.js-commando";
import { corpusManager } from "../../app";
import { colors } from "../../modules/colors";
import { config } from "../../../config";
import * as utils from "../../modules/utils";
import * as embeds from "../../modules/embeds";
import { learnFrom } from "../../modules/learning";
import { ChannelCrawler } from "../../modules/channel-crawler";


export default class QuickstartCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "quickstart",
			memberName: "quickstart",
			group: "data",
            description: "Scan your past messages to get started using Parrot right away.",
            details: "This command is only available to users with fewer than 100 messages in Parrot's datastore.",
            throttling: {
                usages: 1,
                duration: 60,
            },
            // Not putting `guildOnly: true` here because I want
            //   to use a pretty embed instead of what Commando
            //   normally says.
		});
    }
    

    async run(message: CommandoMessage): Promise<null> {
        // Tell the user off if they try to use Quickstart
        //   in a DM channel.
        if (message.channel.type === "dm") {
            message.embed(embeds.noQuickstartInDMs);
            return null;
        }
        // Show the user where they can use Quickstart within this server
        //   if they use the command in a channel where Parrot can't learn.
        else if (!config.learningChannels.hasOwnProperty(message.channel.id)) {
            message.embed(embeds.quickstartChoices(message.channel.guild));
            return null;
        }

        // Get this user's corpus. Create a blank one if it doesn't exist.
        let corpus: Corpus;
        try {
            corpus = await corpusManager.get(message.author.id);
        } catch (err) {
            if (err.code === "ENOENT") {
                corpus = {};
            } else {
                throw err;
            }
        }

        // If their corpus is small enough, they can use Quickstart!
        if (Object.keys(corpus).length > 100) {
            message.embed(embeds.quickstartWindowPassed);
            return null;
        }

        // Show Parrot's progress on scraping this user's message history.
        const messages = await message.embed({
            title: "Quickstart",
            color: colors.purple,
            fields: [
                {
                    name: "Scanning...",
                    value: "​", // zero width space
                },
            ],
        });
        const statusMessage = utils.firstOf(messages);

        // Make sure to only collect messages that _this_ user sent.
        const filter = (collectedMessage: Message): boolean => {
            return message.author === collectedMessage.author;
        };

        // Collect up to 1,000 messages. The crawler may look at
        //   more than this many to get 1,000 that match the filter.
        const options = {
            max: 1000, // Maybe 10,000?
        };

        // Start collecting messages.
        const crawler = new ChannelCrawler(message.channel, filter, options);

        // Periodically update the embed that Parrot sent to show
        //   how many messages have been collected so far.
        const editLoop = setInterval( () => {
            statusMessage.edit(null, {
                embed: {
                    title: "Quickstart",
                    color: colors.purple,
                    fields: [
                        {
                            name: "Scanning...",
                            value: `Collected ${crawler.collected.size} messages...`,
                        }
                    ],
                    footer: {
                        text: `${crawler.received} total messages scanned`,
                    },
                },
            }); 
        }, 2000);

        // Add each collected message to the user's corpus.
        crawler.on("collect", learnFrom);

        // Edit the embed one last time to show that it's done,
        //   and stop the loop that updates progress.
        crawler.once("end", () => {
            clearInterval(editLoop);
            statusMessage.edit(null, {
                embed: {
                    title: "Quickstart",
                    color: colors.green,
                    fields: [
                        {
                            name: "Scan complete",
                            value: `Collected ${crawler.collected.size} messages.`,
                        }
                    ],
                    footer: {
                        text: `${crawler.received} total messages scanned`,
                    },
                },
            });
        });

        // The Crawler has its marching orders, so now let it loose!
        crawler.start();

        return null;
    }
};
