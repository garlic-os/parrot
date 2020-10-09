import type { MessageEmbedOptions } from "discord.js";
import { MessageEmbed } from "discord.js";
import { colors } from "./colors";

export class ParrotEmbed extends MessageEmbed {
    constructor(data: MessageEmbed | MessageEmbedOptions | undefined) {
        super(data);
        this.color = this.color || colors.purple;
        this.title = this.title || "Parrot";
    }
}
