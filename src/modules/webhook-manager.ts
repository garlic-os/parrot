import type { Maybe } from "..";
import type { Snowflake } from "discord.js";

import { config } from "../config";
import { WebhookClient } from "discord.js";

export class WebhookManager extends Map {
    // Get a WebhookClient from config.speakingChannels if
    //   config has a webhook for this channel.
    get(channelID: Snowflake): Maybe<WebhookClient> {
        // Get this WebhookClient from cache, if it's there.
        if (this.has(channelID)) {
            return super.get(channelID);
        }

        // Create a WebhookClient from the information in
        //   config.speakingChannels corresponding to the given channel ID.
        // Cache this WebhookClient for next time.
        const webhookConfig = config.speakingChannels[channelID];
        if (webhookConfig) {
            const { id, token } = webhookConfig;
            const webhook = new WebhookClient(id, token);
            this.set(channelID, webhook);
            return webhook;
        } else {
            return null;
        }
    }
}
