import { corpusManager } from "../app";
import { SizeCappedMap } from "./size-capped-map";
import MarkovChain from "purpl-markov-chain";

export class ChainManager {
    private readonly cache: SizeCappedMap;

    constructor(maxCacheSize: number) {
        this.cache = new SizeCappedMap(maxCacheSize);
    }

    
    // Get a Markov Chain by user ID;
    //   from cache if it's cached, from corpus if it's not.
    // Null if there is no corpus for this user ID.
    get(userID: string): MarkovChain | null {
        if (this.cache.has(userID)) {
            return this.cache.get(userID);
        }
        
        const corpus = corpusManager.get(userID);

        if (!corpus) {
            return null;
        }

        console.debug("[*] got this far", MarkovChain);
        const chain = new MarkovChain(corpus);
        console.debug("[*] got this far");

        this.cache.set(userID, chain);
        return chain;
    }


    has(userID: string): boolean {
        return this.cache.has(userID) || corpusManager.has(userID);
    }
}
