import * as chalk from "chalk";

export default (...args: any) => {
    console.warn(chalk.yellow(...args));
};
