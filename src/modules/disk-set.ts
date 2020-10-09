import type { Snowflake } from "discord.js";
import type { PathLike } from "fs";

import { promises as fs } from "fs";

/**
 * A Set-like class that loads and saves its contents to and from a file.
 * "I used to be a Set, but then I took an Promise to the knee."
 */
export class DiskSet {
    filePath: PathLike;
    set: Set<any>;
    ready: Promise<this>;


    constructor(filePath: PathLike) {
        this.filePath = filePath;
        this.set = new Set();
        this.ready = this.loadFromDisk();
    }


    private async loadFromDisk(): Promise<this> {
        let array = [];
        let isNewFile = false;

        // Read an array from a file to use as the base for this Set.
        // If the file does not exist, make it.
        // If the file does exist, it must be no more and no less than
        //   a single array.
        try {
            const jsonData = await fs.readFile(this.filePath, "utf-8");
            const parsed = JSON.parse(jsonData);
            if (parsed instanceof Array) {
                array = parsed;
            } else {
                throw new TypeError(`Provided file "${this.filePath}" is valid JSON, but is not in the right format. The data must resolve to no more than a single Array.`);
            }

        } catch (err) {
            if (err.code === "ENOENT") {
                console.warn(`File "${this.filePath}" not found. A new file will be created in its place.`);
                isNewFile = true;
            }
            else if (err instanceof SyntaxError) {
                throw new Error(`Error while JSON parsing the file. Please provide the path to a valid JSON array or to a file that doesn't exist. Path provided: ${this.filePath}`);
            }
            else {
                throw err;
            }
        }

        // Make the contents of the array the new contents of the Set.
        this.set = new Set(array);

        if (isNewFile) {
            await this.saveToDisk();
        }
        return this;
    }


    private async saveToDisk(): Promise<this> {
        await fs.writeFile(this.filePath, this.toString());
        return this;
    }


    // Mirror changes to this Set to a JSON file on disk.
    async add(userID: Snowflake): Promise<this> {
        this.set.add(userID);
        await this.saveToDisk();
        return this;
    }


    async delete(userID: Snowflake): Promise<boolean> {
        const wasDeleted = this.set.delete(userID);
        if (wasDeleted) {
            await this.saveToDisk();
        }
        return wasDeleted;
    }


    has(key: any): boolean {
        return this.set.has(key);
    }


    toString(): string {
        return JSON.stringify(Array.from(this.set));
    }
}
