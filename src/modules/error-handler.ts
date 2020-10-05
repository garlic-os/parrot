import type { ErrorLike } from "..";
import { client } from "../app";

export const handleError = (err: ErrorLike): void => {
    if (process.env.NODE_ENV === "production") {
        console.error({ err });
        let msg = err;
        if (typeof err !== "string") {
            msg = err.message;
        }
        if (client) {
            for (const user of client.owners) {
                user.send(msg);
            }
        }
    } else {
        throw err;
    }
};
