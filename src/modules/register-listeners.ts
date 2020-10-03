import type { CommandoClient } from "discord.js-commando";

import { ensureDirectory } from "./ensure-directory";
import * as path from "path";
import * as fs from "fs";

const listenersDir = path.join(__dirname, "../listeners");
ensureDirectory(listenersDir);

export const registerListeners = (client: CommandoClient): void => {
    const files = fs.readdirSync(listenersDir);

    for (const filename of files) {
        const moduleName = path.parse(filename).name;
        const modulePath = path.join(listenersDir, moduleName);
        let listener = require(modulePath);

        if (listener.default instanceof Function) {
            listener = listener.default;
        }

        client.on(moduleName, listener);
    }
};
