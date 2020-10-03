import type { Command } from "discord.js-commando";

import { FriendlyError } from "discord.js-commando";
import * as chalk from "chalk";

export default (command: Command, err: Error | FriendlyError): void => {
    if (err instanceof FriendlyError) {
        return;
    };
    console.error(chalk.red(`Error in command ${command.groupID}:${command.memberName}`, err));
};
