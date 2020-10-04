import { Snowflake } from "discord.js";
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
    get(userID: Snowflake): ParrotPurpl {
        if (this.cache.has(userID)) {
            return this.cache.get(userID);
        }
        
        const corpus = corpusManager.get(userID);

        if (!corpus) {
            throw {
                code: "NODATA",
                message: `No data available for user ${userID}`
            };
        }

        const chain = new ParrotPurpl();

        for (const sentence of corpus) {
            chain.update(sentence);
        }

        this.cache.set(userID, chain);
        return chain;
    }


    has(userID: Snowflake): boolean {
        return this.cache.has(userID) || corpusManager.has(userID);
    }
}
