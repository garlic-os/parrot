import type {
    ChannelLogsQueryOptions, CollectorFilter, Message,
    MessageCollectorOptions, Snowflake, TextChannel
} from "discord.js";

import { Collection } from "discord.js";
import { EventEmitter } from "events";
import message from "../listeners/message";

type ChannelCrawlerEndReason = "channelBeginningReached" | "limit" | "processedLimit";
type UserReason = string;


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


    private lastMessage(messages: Message[]): Message | undefined {
        for (let i = messages.length; i > 0; --i) {
            if (messages[i]) {
                return messages[i];
            }
        }
        return undefined;
    };


    // A pusedo-recursive async function that scrapes the channel until a quota
    //   is met or the top of the channel is reached.
    private async getMessages(query: ChannelLogsQueryOptions): Promise<ChannelCrawlerEndReason | UserReason> {
        const messages = (await this.channel.messages.fetch(query)).array();
        const lastMessage = this.lastMessage(messages);

        // If there are no more messages or a quota has been met, stop crawling.
        if (messages.length === 0 || !lastMessage) {
            return "channelBeginningReached";
        } else if (this.options.max && this.collected.size >= this.options.max) {
            return "limit";
        } else if (this.options.maxProcessed && this.received >= this.options.maxProcessed) {
            return "processedLimit";
        }
        
        // Start on getting the next batch.
        query.before = lastMessage.id;
        const endReasonPromise = this.getMessages(query);

        this.received += messages.length;

        for (const message of messages) {
            // Ended prematurely by the user
            if (this.ended) {
                return this.userReason;
            }

            // Collect this message if it passes the filter;
            //   dispose of it if it doesn't.
            if (this.filter(message)) {
                this.collected.set(message.id, message);
                this.emit("collect", message);
            } else {
                this.emit("dispose", message);
            }
        }

        // Wait for all "child" calls to resolve.
        // An end reason will eventually bubble up from the recursion hole.
        return await endReasonPromise;
    }


    // Start crawling.
    start(): this {
        const query: ChannelLogsQueryOptions = {
            limit: 100,
        };

        this.getMessages(query).then( (reason: string) => {
            this.ended = true;
            this.emit("end", this.collected, reason);
        });

        return this;
    }


    // Stop the crawling early.
    stop(reason: string="user"): this {
        this.ended = true;
        this.userReason = reason;
        return this;
    }
}
