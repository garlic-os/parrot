import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { Command } from "discord.js-commando";
import { colors } from "../../modules/colors";
import { corpusManager } from "../../app";

import * as fs from "fs";
import * as FormData from "form-data";
import axios from "axios";

const prefix = process.env.COMMAND_PREFIX;


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
        const corpusFilePath = corpusManager.pathTo(message.author.id);

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

        const { url } = JSON.parse(response.data);

        await message.author.send({
            title: "Link to download your data",
            description: url,
            footer: {
                text: "Link expires in 6 hours.",
            },
        });

        message.embed({
            title: "Download ready",
            color: colors.green,
            description: "A link to download your data has been DM'd to you.",
        });
        return null;
    }
};
