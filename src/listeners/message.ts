import type { Message } from "discord.js";

import { config } from "../config";
import { learnFrom } from "../modules/learning";

export default (message: Message) => {
    // I am a mature person making a competent Discord bot.
    if (message.content === "ayy" && config.ayyLmao) {
        message.channel.send("lmao");
    }

    learnFrom(message);
};
