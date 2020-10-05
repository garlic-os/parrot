import type { Corpus, Maybe, MaybeArray } from "..";
import type { Snowflake } from "discord.js";

import { ensureDirectory } from "./ensure-directory";
import { DiskSet } from "./disk-set";
import { chainManager } from "../app";
import * as path from "path";
import { promises as fs } from "fs";
import { Message } from "discord.js";

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


    // Record a message to a user's corpus.
    // Also update any Markov Chain they might have cached with that data.
    async add(userID: Snowflake, messages: MaybeArray<Message>): Promise<this> {
        if (!(await this.has(userID))) {
            // Create empty file
            const corpusPath = path.join(this.dir, userID + ".json");
            fs.open(corpusPath, "w");
        }

        // Ensure the message(s) is/are in an array so we're
        //   always able to just for-loop over it.
        if (messages instanceof Message) {
            messages = [messages];
        }

        const cachedChain = chainManager.cache.get(userID);
        const corpus = await this.get(userID);

        for (const message of messages) {
            corpus[message.id] = {
                content: message.content,
                timestamp: message.createdTimestamp,
            };
            if (cachedChain) {
                cachedChain.update(message.content);
            }
        }

        this.set(userID, corpus);
        return this;
    }


    // Get a corpus by user ID.
    // Throws ENOENT if the corpus does not exist.
    // Throws NOTREG if the user is registered.
    async get(userID: Snowflake): Promise<Corpus> {
        this.assertRegistration(userID);

        const corpusPath = path.join(this.dir, userID + ".json");
        const jsonData = await fs.readFile(corpusPath, "utf-8");
        return JSON.parse(jsonData);
    }


    // Create or overwrite a corpus, adding it to the filesystem and to cache.
    async set(userID: Snowflake, corpus: Corpus): Promise<this> {
        this.assertRegistration(userID);

        const corpusPath = path.join(this.dir, userID + ".json");
        await fs.writeFile(corpusPath, JSON.stringify(corpus));
        return this;
    }


    // Delete a user's corpus file from disk.
    async delete(userID: Snowflake): Promise<boolean> {
        const corpusPath = path.join(this.dir, userID + ".json");
        try {
            await fs.unlink(corpusPath);
        } catch (err) {
            return false;
        }
        return true;
    }


    async has(userID: Snowflake): Promise<boolean> {
        const corpusPath = path.join(this.dir, userID + ".json");
        try {
            await fs.stat(corpusPath);
            return true;
        } catch (err) {
            if (err.code === "ENOENT") {
                return false;
            }
            throw err;
        }
    }


    async pathTo(userID: Snowflake): Promise<Maybe<string>> {
        if (await this.has(userID)) {
            return path.join(this.dir, userID + ".json");
        }
        return null;
    }
}
