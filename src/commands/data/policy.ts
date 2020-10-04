import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import * as fs from "fs";
import * as path from "path";
import { Command } from "discord.js-commando";
import { colors } from "../../modules/colors";

const prefix = process.env.COMMAND_PREFIX;

const policyPath = path.join(__dirname, "../../../privacy-policy.txt");
const policy: string = fs.readFileSync(policyPath, "utf-8");


export default class PolicyCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "policy",
			memberName: "policy",
			aliases: ["privacy_policy", "privacypolicy", "privacy", "terms_of_service", "termsofservice", "tos", "terms", "eula"],
			group: "data",
            description: "View Parrot's privacy policy.",
            details: "Parrot collects the message history of registered users to imitate them. Learn more about Parrot's data collection practices here.",
            throttling: {
                usages: 2,
                duration: 4,
            },
		});
    }
    

    run(message: CommandoMessage): null {
        message.embed({
            title: "Privacy Policy",
            color: colors.purple,
            description: policy,
            footer: {
                text: `${prefix}register • ${prefix}unregister`,
            },
        });
        return null;
    }
};
