import { Snowflake } from "discord.js";

import { ensureDirectory } from "./ensure-directory";
import { DiskSet } from "./disk-set";
import * as path from "path";
import * as fs from "fs";
import { chainManager } from "../app";

/**
 * Provides methods for accessing elements in
 *   Parrot's database of corpora.
 * Also enforces that users are registered in a
 *   file before their data can be accesed.
 */
export class CorpusManager {
    private readonly dir: string;
    userRegistry: DiskSet;

    constructor(dir: string) {
        this.dir = dir;
        ensureDirectory(this.dir);

        const registryFilePath = path.join(this.dir, "user-registry.json");
        this.userRegistry = new DiskSet(registryFilePath);
    }


    // This method throws a NOTREG error if the provided user is not
    //   present in the User Registry file.
    private assertRegistration(userID: Snowflake): void {
        if (!this.userRegistry.has(userID)) {
            throw {
                code: "NOTREG",
                message: `User ${userID} is not registered`,
            };
        }
    }


    // Append data to a user's corpus.
    // Also add that data to any Markov Chain they might have cached.
    add(userID: Snowflake, content: string): this {
        this.assertRegistration(userID);

        const corpusPath = path.join(this.dir, userID + ".txt");
        fs.appendFileSync(corpusPath, content);
        
        const cachedChain = chainManager.cache.get(userID);
        if (cachedChain) {
            cachedChain.update(content);
        }

        return this;
    }


    // Get a corpus by user ID.
    // Throws ENOENT if the corpus does not exist.
    // Throws NOTREG if the user is registered.
    get(userID: Snowflake): string[] {
        this.assertRegistration(userID);

        const corpusPath = path.join(this.dir, userID + ".txt");
        return fs.readFileSync(corpusPath, "utf-8")
            .replace("\r", "")
            .split("\n");
    }


    // Create or overwrite a corpus, adding it to the filesystem and to cache.
    set(userID: Snowflake, corpus: string[]): this {
        this.assertRegistration(userID);

        const corpusPath = path.join(this.dir, userID + ".txt");
        fs.writeFileSync(corpusPath, JSON.stringify(corpus));
        return this;
    }


    // Delete a user's corpus file from disk.
    delete(userID: Snowflake): boolean {
        const corpusPath = path.join(this.dir, userID + ".txt");
        try {
            fs.unlinkSync(corpusPath);
        } catch (err) {
            return false;
        }
        return true;
    }


    has(userID: Snowflake): boolean {
        const corpusPath = path.join(this.dir, userID + ".txt");
        return fs.existsSync(corpusPath);
    }


    pathTo(userID: Snowflake): string {
        return path.join(this.dir, userID + ".txt");
    }
}
