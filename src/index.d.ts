import type { Snowflake, User } from "discord.js";


export type ErrorLike = Error | string | { code: string, message: string };
export type Maybe<T> = T | null;
export type MaybeArray<T> = T | T[];


export interface CorpusMessage {
    // Maps to Discord.Message.content
    content: string;

    // Maps to Discord.Message.createdTimestamp
    timestamp: number;
}

export interface Corpus {
    // key: message ID Snowflake
    [key: string]: CorpusMessage;
}


export interface WebhookConfig {
    id: Snowflake;
    token: string;
}

export interface SpeakingChannels {
    // Key: channel ID
    // If value is null, use text mode in this channel.
    [key: string]: Maybe<WebhookConfig>;
}

export interface LearningChannels {
    // Key: channel ID
    // Value: human-readable name for the channel
    [key: string]: string;
}

export interface Config {
    ayyLmao: boolean;
    cacheSize: number;
    commandPrefix: string;
    corpusDir: string;
    discordBotToken: string;
    learningChannels: LearningChannels;
    speakingChannels: SpeakingChannels;
    owners: Snowflake[];
}

export interface ConfigDefaults {
    ayyLmao: boolean;
    cacheSize: number;
    commandPrefix: string;
    corpusDir: string;
    discordBotToken: undefined;
    learningChannels: undefined;
    speakingChannels: undefined;
    owners: undefined;
}

export interface PartialConfig {
    ayyLmao?: boolean;
    cacheSize?: number;
    commandPrefix?: string;
    corpusDir?: string;
    discordBotToken: string;
    learningChannels: LearningChannels;
    speakingChannels: SpeakingChannels;
    owners: Snowflake[];
}


export interface ImitateCommandArguments {
    user: User;
    startword: string;
}
