import { ensureDirectory } from "./ensure-directory";
import * as path from "path";
import * as fs from "fs";

export class CorpusManager {
    private readonly dir: string;

    constructor(dir: string) {
        this.dir = dir;
        ensureDirectory(this.dir);
    }

    // Get a corpus by user ID.
    // Null if there is no corpus for this user ID.
    get(userID: string): string | null {
        const corpusPath = path.join(this.dir, userID + ".txt");
        console.debug(corpusPath);

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
        const corpusPath = path.join(this.dir, userID, ".txt");
        fs.writeFileSync(corpusPath, corpus);
        return this;
    }


    // Remove a corpus from the filesystem and from cache.
    delete(userID: string): boolean {
        const corpusPath = path.join(this.dir, userID, ".txt");
        try {
            fs.unlinkSync(corpusPath);
        } catch (err) {
            return false;
        }
        return true;
    }


    has(userID: string): boolean {
        const corpusPath = path.join(this.dir, userID, ".txt");
        return fs.existsSync(corpusPath);
    }
}
