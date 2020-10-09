import type { Config, PartialConfig } from "./";
import { defaults } from "./defaults";

//  \/ FILL IN HERE! \/
const userConfig: PartialConfig = {
    ayyLmao: defaults.ayyLmao,
    cacheSize: defaults.cacheSize,
    commandPrefix: defaults.commandPrefix,
    corpusDir: defaults.corpusDir,
    discordBotToken: "",
    learningChannels: {},
    speakingChannels: {},
    owners: [],
};
//  /\ FILL IN HERE! /\

export const config: Config = {
    ...defaults,
    ...userConfig,
};
