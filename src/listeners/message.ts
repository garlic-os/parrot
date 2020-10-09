import type { Message } from "discord.js";
import { client } from "../app";
import { learnFrom } from "../modules/learning";

export default (message: Message): void => {
    if (message.author.id === client.user?.id) {
        // TODO: Log that Parrot sent a message
        message.channel.stopTyping();
        return;
    }

    // I am a mature person making a competent Discord bot.
    if (message.content === "ayy" && process.env.AYY_LMAO === "true") {
        message.channel.send("lmao");
    }

    learnFrom(message);
};
