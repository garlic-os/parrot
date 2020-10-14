import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { gibberish } from "../../modules/gibberish";
import { Command } from "discord.js-commando";


interface GibberishCommandArguments {
    text: string[];
}


export default class GibberishCommand extends Command {
	constructor(client: CommandoClient) {
		super(client, {
			name: "gibberish",
            memberName: "gibberish",
            aliases: ["gib", "gibgen"],
			group: "text",
            description: "Make gibberish out of a message.",
            details: "This code was originally made by Keith Enevoldsen: thinkzone.wlonk.com",
            throttling: {
                usages: 2,
                duration: 5,
            },
            args: [
                {
                    key: "text",
                    prompt: "Text to feed into the gibberish machine",
                    type: "string",
                    infinite: true,
                },
            ],
		});
    }
    

    run(message: CommandoMessage, { text }: GibberishCommandArguments): null {
        const input = text.join(" ");

        if (input.length < 4) {
            message.reply("the input should be least 4 characters to generate gibberish.");
            return null;
        }

        const outputLength = ~~(Math.random() * 495 + 5); // 5-500 characters
        const stateSize = ~~(Math.random() * 2 + 2); // State size 2-4

        let outputText = "";
        let tries = 1;
        // Sometimes gibberish() fails for a reason I haven't pinned down yet.
        //   If this happens, retry up to 999 times.
        do {
            try {
                outputText = gibberish(input, stateSize, outputLength);
            } catch (err) {
                if (err.code === "RANGE") {
                    if (++tries > 1000) {
                        console.error("Gibberish RangeError triggered.", {
                            text,
                            outputLength,
                            stateSize,
                        });
                        message.say("Error: gibberish generator failed 1,000 times in a row. It must really not like that input.");
                        return null;
                    }
                } else {
                    throw err;
                }
            }
        } while (!outputText);

        message.say(outputText);
        return null;
    }
};
