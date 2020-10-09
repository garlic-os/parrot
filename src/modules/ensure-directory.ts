import * as fs from "fs";

export const ensureDirectory = (path: fs.PathLike): void => {
    try {
        fs.mkdirSync(path);
    } catch (err) {
        if (err.code !== "EEXIST") {
            throw err;
        }
    }
};
