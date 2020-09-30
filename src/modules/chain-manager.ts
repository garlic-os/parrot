import { corpusManager } from "../app";
import { SizeCappedMap } from "./size-capped-map";
import MarkovChain from "purpl-markov-chain";

const maxCacheSize: number = parseInt(<string>process.env.CACHE_SIZE, 10);
const cache = new SizeCappedMap(maxCacheSize);


export class ChainManager extends Map {
    // Get a Markov Chain by user ID;
    //   from cache if it's cached, from corpus if it's not.
    // Null if there is no corpus for this user ID.
    get(userID: string): MarkovChain | null {
        if (cache.has(userID)) {
            return cache.get(userID);
        }
        
        const corpus = corpusManager.get(userID);

        if (!corpus) {
            return null;
        }

        const chain = new MarkovChain(corpus);

        cache.set(userID, chain);
        return chain;
    }


    has(userID: string): boolean {
        return cache.has(userID) || corpusManager.has(userID);
    }
}
