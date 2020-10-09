import type { ConfigDefaults } from "./";
import * as path from "path";

export const defaults: ConfigDefaults = {
    ayyLmao: false,
    cacheSize: 5,
    commandPrefix: "|",
    corpusDir: path.join(__dirname, "../corpora/"),
    discordBotToken: undefined,
    learningChannels: undefined,
    speakingChannels: undefined,
    owners: undefined,
};
