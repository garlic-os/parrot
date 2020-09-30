export interface WebhookConfig {
    id: string;
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
