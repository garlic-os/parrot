import type {
    ChannelLogsQueryOptions, CollectorFilter, Message,
    MessageCollectorOptions, Snowflake, TextChannel
} from "discord.js";

import { Collection } from "discord.js";
import { EventEmitter } from "events";
import * as utils from "./utils";

// This is what I thought Discord.MessageCollector was going to be.
// Turns out MessageCollector does something different, so I made
//   what I want myself.
export class ChannelCrawler extends EventEmitter {
    channel: TextChannel;
    filter: CollectorFilter;
    options: MessageCollectorOptions;
    collected: Collection<Snowflake, Message>;
    ended: boolean;
    received: number;
    private userReason: string;

    constructor(channel: TextChannel, filter?: CollectorFilter, options?: MessageCollectorOptions) {
        super();
        this.channel = channel;
        this.filter = filter || (() => true);
        this.options = options || {};
        this.collected = new Collection();
        this.ended = false;
        this.received = 0;
        this.userReason = "user";

        if (!this.options.max && !this.options.maxProcessed) {
            console.warn("ChannelCrawler was instantiated with no limit on the number of messages it should collect or process. This Crawler will crawl until it reaches the beginning of the channel.");
        }
    }


    // A pusedo-recursive async function that scrapes the channel until a
    //   quota is met or the top of the channel is reached.
    private async getMessages(query: ChannelLogsQueryOptions): Promise<string> {
        const messages = Array.from((await this.channel.messages.fetch(query)).values());
        query.before = utils.lastOf(messages).id;

        // If there are no more messages or a quota has been met, stop crawling.
        if (messages.length === 0) {
            return "channelBeginningReached";
        } else if (this.options.max && this.options.max >= this.collected.size) {
            return "limit";
        } else if (this.options.maxProcessed && this.options.maxProcessed >= this.received) {
            return "processedLimit";
        }
        
        // Start on getting the next batch.
        // An end reason will eventually bubble up from the recursion hole.
        const endReasonPromise = this.getMessages(query);

        this.received += messages.length;

        for (let message of messages) {
            // Ended prematurely by the user
            if (this.ended) {
                return this.userReason;
            }

            // In case the message is actually in message[1].
			// No, it is never in message[0].
			if (message instanceof Array) {
				message = message[1];
            }

            if (this.filter(message)) {
                this.collected.set(message.id, message);
                this.emit("collect", message);
            } else {
                this.emit("dispose", message);
            }
        }

        // Wait for all "child" calls to finish.
        // This will not resolve until every call futher down
        //   in the recursion hole has resolved.
        return await endReasonPromise;
    }


    // Start crawling.
    start() {
        const query: ChannelLogsQueryOptions = {
            limit: 100,
        };

        this.getMessages(query).then( (reason: string) => {
            this.emit("end", this.collected, reason);
            this.ended = true;
        });
    }


    // Stop the crawling early.
    stop(reason: string="user") {
        this.ended = true;
        this.userReason = reason;
    }
}
