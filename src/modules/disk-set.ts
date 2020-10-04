import type { Snowflake } from "discord.js";
import * as fs from "fs";

/**
 * A Set that loads and saves its contents to and from a file.
 */
export class DiskSet extends Set {
    filePath: fs.PathLike;

    constructor(filePath: fs.PathLike) {
        super();
        this.filePath = filePath;

        // Load from disk. I'd make this its own method, but it
        //   uses a super() call, which is only allowed inside
        //   the constructor, forcing it to stay inlined.
        try {
            const jsonData = fs.readFileSync(filePath, "utf-8");
            super(JSON.parse(jsonData));
        } catch (err) {
            if (err.code === "ENOENT") {
                console.warn(`File "${filePath}" not found. It will be created next time this Set is modified.`);
            } else if (err instanceof SyntaxError) {
                throw new Error(`Error while JSON parsing the file. Please provide the path to a valid JSON array. Path provided: ${filePath}`);
            } else {
                throw err;
            }
        }
    }


    private saveToDisk(): void {
        // This is admittedly inefficient, but I imagine it
        //   (probably) won't happen a lot.
        fs.writeFileSync(this.filePath, this.toString());
    }


    // Mirror changes to this Set to a JSON file on disk.
    add(userID: Snowflake): this {
        super.add(userID);
        this.saveToDisk();
        return this;
    }


    delete(userID: Snowflake): boolean {
        const wasDeleted = super.delete(userID);
        if (wasDeleted) {
            this.saveToDisk();
        }
        return wasDeleted;
    }


    toString(): string {
        return JSON.stringify(Array.from(this));
    }
}
