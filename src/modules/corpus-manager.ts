// REMINDER: When implementing Parrot's learning behavior,
//           take advantage of purpl-markov-chain's chain.update() method.

import * as path from "path";
import * as fs from "fs";

const corpusDir = "../../corpora";

// Make sure the directory actually exists before trying to use it.
try {
    fs.mkdirSync(corpusDir);
} catch (err) {
    if (err.code !== "EEXIST") {
        throw err;
    }
}

export class CorpusManager extends Map {
    // Get a corpus by user ID.
    // Null if there is no corpus for this user ID.
    get(userID: string): string | null {
        const corpusPath = path.join(corpusDir, userID, ".txt");

        try {
            return fs.readFileSync(corpusPath, "utf-8");
        } catch (err) {
            if (err.code !== "ENOENT") {
                throw err;
            }
        }

        return null;
    }


    // Create or overwrite a corpus, adding it to the filesystem and to cache.
    set(userID: string, corpus: string): this {
        const corpusPath = path.join(corpusDir, userID, ".txt");
        fs.writeFileSync(corpusPath, corpus);
        return this;
    }


    // Remove a corpus from the filesystem and from cache.
    delete(userID: string): boolean {
        const corpusPath = path.join(corpusDir, userID, ".txt");
        try {
            fs.unlinkSync(corpusPath);
        } catch (err) {
            return false;
        }
        return true;
    }


    has(userID: string): boolean {
        const corpusPath = path.join(corpusDir, userID, ".txt");
        return fs.existsSync(corpusPath);
    }
}
