import { client } from "../app";

export const handleError = (err: Error | string): void => {
    if (process.env.NODE_ENV === "production") {
        console.error({ err });
        if (client) {
            for (const user of client.owners) {
                user.send(err);
            }
        }
    } else {
        throw err;
    }
};
