import type { Snowflake, User } from "discord.js";
import type { Corpus } from "..";

import { corpusManager } from "../app";
import { SizeCappedMap } from "./size-capped-map";
import { ParrotPurpl } from "./parrot-purpl";
import { ParrotError } from "./parrot-error";

export class ChainManager {
    readonly cache: SizeCappedMap<Snowflake, ParrotPurpl>;

    constructor(maxCacheSize: number) {
        this.cache = new SizeCappedMap(maxCacheSize);
    }

    
    // Get a Markov Chain by user ID;
    //   from cache if it's cached, from corpus if it's not.
    async get(user: User): Promise<ParrotPurpl> {
        const cachedChain = this.cache.get(user.id);
        if (cachedChain) {
            return cachedChain;
        }
        
        let corpus: Corpus;
        try {
            corpus = await corpusManager.get(user);
        } catch (err) {
            if (err.code === "ENOENT") {
                throw new ParrotError({
                    name: "No data",
                    code: "NODATA",
                    message: `No data available for user ${user.tag}`
                });
            }
            throw err;
        }

        const chain = new ParrotPurpl();

        for (const messageID in corpus) {
            chain.update(corpus[messageID].content);
        }

        this.cache.set(user.id, chain);
        return chain;
    }


    async has(user: User): Promise<boolean> {
        return this.cache.has(user.id) || (await corpusManager.has(user));
    }
}
