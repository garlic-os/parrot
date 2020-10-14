import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import * as embeds from "../../modules/embeds";
import { corpusManager } from "../../app";

import * as fs from "fs";
import * as FormData from "form-data";
import axios from "axios";


export default class DownloadCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "download",
            memberName: "download",
            aliases: ["checkout"],
			group: "data",
            description: "Download a copy of your data.",
            throttling: {
                usages: 2,
                duration: 60 * 60, // 1 hour
            },
		});
    }
    

    async run(message: CommandoMessage): Promise<null> {
        const corpusFilePath = await corpusManager.pathTo(message.author);

        if (!corpusFilePath) {
            message.embed(embeds.noData(message.author));
            return null;
        }

        // Create an artificial HTML form to put the file in.
        // It's weird but that's how you POST files
        const form = new FormData();
        form.append("file", fs.createReadStream(corpusFilePath));

        // Upload to anonfiles because it has a free upload API lmao
        // TODO: Do anything but this
        const response = await axios.post("https://api.anonymousfiles.io/", form, {
            params: {
                expires: "6h",
                no_index: true,
            },
            headers: {
                ...form.getHeaders(),
            },
        });

        // Dig the new download URL out of the response data.
        const { url } = response.data;

        // DM the user their download link.
        await message.author.send(embeds.dataDownloadLink(url));

        // Tell them to check their DMs.
        message.embed(embeds.downloadReady);
        return null;
    }
};
