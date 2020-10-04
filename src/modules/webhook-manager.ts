import { Snowflake } from "discord.js";

import { config } from "../../config";
import { WebhookClient } from "discord.js";

export class WebhookManager extends Map {
    get(channelID: Snowflake): WebhookClient | null {
        if (this.has(channelID)) {
            return super.get(channelID);
        }

        if (config.speakingChannels.hasOwnProperty(channelID)) {
            const { id, token } = config.speakingChannels[channelID].webhook;
            const webhook = new WebhookClient(id, token);
            this.set(channelID, webhook);
            return webhook;
        }
        return null;
    }
}
