import { Snowflake } from "discord.js";

export interface WebhookConfig {
    id: Snowflake;
    token: string;
}

export interface ChannelConfig {
    webhook: WebhookConfig;
}

export interface SpeakingChannels {
    [key: string]: ChannelConfig;
}

export interface Config {
    speakingChannels: SpeakingChannels;
}
