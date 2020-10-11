import type { Message } from "discord.js";

import { config } from "../config";
import { learnFrom } from "../modules/learning";

export default async (message: Message) => {
    // I am a mature person making a competent Discord bot.
    if (message.content === "ayy" && config.ayyLmao) {
        message.channel.send("lmao");
    }

    const learnedCount = await learnFrom(message);

    // Log results.
    if (learnedCount === 1) {
        console.log(`Collected a message from ${message.author.tag}`);
    } else if (learnedCount !== 0 && learnedCount !== -1) {
        console.log(`Collected ${learnedCount} messages from ${message.author.tag}`);
    }
};
