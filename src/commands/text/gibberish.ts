import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import { gibberish } from "../../modules/gibberish";
import { Command } from "discord.js-commando";
import { triggerAsyncId } from "async_hooks";


interface GibberishCommandArguments {
    text: string;
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
                    parse: (_: any, message: CommandoMessage): string => {
                        return message.argString.substring(1);
                    },
                },
            ],
		});
    }
    

    run(message: CommandoMessage, { text }: GibberishCommandArguments): null {
        if (text.length < 4) {
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
                outputText = gibberish(text, stateSize, outputLength);
            } catch (err) {
                if (err.code === "RANGE") {
                    if (++tries > 1000) {
                        console.error("Gibberish RangeError triggered.", {
                            text,
                            outputLength,
                            stateSize,
                        });
                        message.say("Error: managed to trigger the random bug that makes the gibberish generator fail, 1,000 times in a row. I give up.");
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
