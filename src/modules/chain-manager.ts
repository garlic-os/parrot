import type { Snowflake } from "discord.js";
import type { Corpus } from "..";

import { corpusManager } from "../app";
import { SizeCappedMap } from "./size-capped-map";
import { ParrotPurpl } from "./parrot-purpl";

export class ChainManager {
    readonly cache: SizeCappedMap;

    constructor(maxCacheSize: number) {
        this.cache = new SizeCappedMap(maxCacheSize);
    }

    
    // Get a Markov Chain by user ID;
    //   from cache if it's cached, from corpus if it's not.
    // Null if there is no corpus for this user ID.
    async get(userID: Snowflake): Promise<ParrotPurpl> {
        if (this.cache.has(userID)) {
            return this.cache.get(userID);
        }
        
        let corpus: Corpus;
        try {
            corpus = await corpusManager.get(userID);
        } catch (err) {
            if (err.code === "ENOENT") {
                throw {
                    code: "NODATA",
                    message: `No data available for user ${userID}`
                };
            }
            throw err;
        }

        const chain = new ParrotPurpl();

        for (const messageID in corpus) {
            const { content } = corpus[messageID];
            chain.update(corpus, content);
        }

        this.cache.set(userID, chain);
        return chain;
    }


    async has(userID: Snowflake): Promise<boolean> {
        return this.cache.has(userID) || (await corpusManager.has(userID));
    }
}
