import * as chalk from "chalk";

const filter = [
    "[WS => ",
    "[WS => Shard",
]

export default (...args: any) => {
    for (const text of filter) {
        if (args[0].startsWith(text)) {
            return;
        }
    }
    console.debug(chalk.gray(...args));
};
