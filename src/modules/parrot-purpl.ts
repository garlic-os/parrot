import type { Maybe } from "..";
import { ParrotError } from "./parrot-error";

// Importing returns undefined 🤷‍♂️
const MarkovChain = require("purpl-markov-chain");

export class ParrotPurpl extends MarkovChain {
    // We have to expect to try multiple times to get valid output
    //   from .generate() because sometimes it returns an empty
    //   string.
    private tryGenerate(maxAttempts: number=1000): Maybe<string> {
        for (let i = 0; i < maxAttempts; ++i) {
            const sentence = super.generate();
            if (sentence) {
                return sentence;
            }
        }
        return null;
    }

    generate(sentenceCount: number=1): string {
        let phrase: string[] = [];

        for (let i = 0; i < sentenceCount; ++i) { // haha ++i
            let addition = this.tryGenerate(100)?.split(" ");
            if (!addition) {
                this.config.from = "";
                addition = this.tryGenerate(900)?.split(" ");
                if (!addition) {
                    throw new ParrotError({
                        // The Markov Chain "drew a blank". Try as it might,
                        //   for some reason it just couldn't come up with
                        //   anything to say.
                        name: "Drew a blank",
                        code: "DREWBLANK",
                        message: "Failed to generate a sentence after 1000 attempts",
                    });
                }
            }

            phrase.concat(addition);
            this.config.from = phrase.pop();
        }

        return phrase.join(" ");
    }
}
