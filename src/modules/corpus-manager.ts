import type { Corpus, Maybe, MaybeArray } from "..";
import type { User } from "discord.js";

import { ensureDirectory } from "./ensure-directory";
import { DiskSet } from "./disk-set";
import { chainManager } from "../app";
import * as path from "path";
import { promises as fs } from "fs";
import { Message } from "discord.js";
import { ParrotError } from "./parrot-error";

/**
 * Provides methods for accessing elements in Parrot's database of corpora.
 * Also enforces that users are registered in
 *   a file before their data can be accesed.
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
    // A special exception for bots: bots don't to be registered.
    private assertRegistration(user: User): void {
        if (!(this.userRegistry.has(user.id) || user.bot)) {
            throw new ParrotError({
                name: "Not registered",
                code: "NOTREG",
                message: `User ${user.id} is not registered`,
            });
        }
    }


    // Record a message to a user's corpus.
    // Also update any Markov Chain they might have cached with that data.
    async add(user: User, messages: MaybeArray<Message>): Promise<void> {
        // Ensure the message(s) is/are in an array so we're always able to just
        //   for-loop over it.
        if (messages instanceof Message) {
            messages = [messages];
        }

        const cachedChain = chainManager.cache.get(user.id);

        let corpus: Corpus = {};
        try {
            corpus = await this.get(user);
        } catch (err) {
            if (err.code !== "ENOENT") {
                throw err;
            }
        }

        for (const message of messages) {
            corpus[message.id] = {
                content: message.content,
                timestamp: message.createdTimestamp,
            };
            cachedChain?.update(message.content);
        }

        this.set(user, corpus);
    }


    // Get a corpus by user ID.
    // Throws ENOENT if the corpus does not exist.
    // Throws NOTREG if the user is registered.
    async get(user: User): Promise<Corpus> {
        this.assertRegistration(user);

        const corpusPath = path.join(this.dir, user.id + ".json");
        const jsonData = await fs.readFile(corpusPath, "utf-8");
        return JSON.parse(jsonData);
    }


    // Create or overwrite a corpus, adding it to the filesystem and to cache.
    async set(user: User, corpus: Corpus): Promise<void> {
        this.assertRegistration(user);

        const corpusPath = path.join(this.dir, user.id + ".json");
        await fs.writeFile(corpusPath, JSON.stringify(corpus));
    }


    // Delete a user's corpus file from disk.
    async delete(user: User): Promise<boolean> {
        const corpusPath = path.join(this.dir, user.id + ".json");
        try {
            await fs.unlink(corpusPath);
        } catch (err) {
            return false;
        }
        return true;
    }


    async has(user: User): Promise<boolean> {
        const corpusPath = path.join(this.dir, user.id + ".json");
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


    async pathTo(user: User): Promise<Maybe<string>> {
        if (await this.has(user)) {
            return path.join(this.dir, user.id + ".json");
        }
        return null;
    }
}
