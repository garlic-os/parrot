import * as chalk from "chalk";
import { client } from "../app";
import * as errorHandler from "../modules/error-handler";

export default (): void => {
    if (client.user) {
        console.log(chalk.green(`Logged in as ${client.user.tag}! (User ID: ${client.user.id})`));
    } else {
        errorHandler.handleError("This is never supposed to happen: the client have a user property");
    }
};
