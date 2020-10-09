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
    [key: string]: WebhookConfig;
}

export interface LearningChannels {
    // Key: channel ID
    // Value: human-readable name for the channel
    [key: string]: string;
}

export interface Config {
    speakingChannels: SpeakingChannels;
    learningChannels: LearningChannels;
}

export interface ImitateCommandArguments {
    user: User;
    startword: string;
}
