import type { User } from "discord.js";
import type { CommandoMessage, CommandoClient } from "discord.js-commando";

import { TextChannel } from "discord.js";
import { ArgumentType } from "discord.js-commando";


/**
 * Coerce a string into a Discord User. Accepts:
 *   - a user mention, like <@95723409575203346>.
 *   - a user ID, like 95723409575203346.
 *   - TODO: "someone"; will return a random user.
 *   - "me"; will return the message author.
 */
export default class Userlike extends ArgumentType {
    constructor(client: CommandoClient) {
        super(client, "userlike");
    }

    async parse(value: string, message: CommandoMessage): Promise<User> {
        // if (value === "someone" || value === "somebody") {
        //     // TODO: Random user
        // }
        if (value === "me") {
            return message.author;
        }
    
        if (message.channel instanceof TextChannel) {
            // Strip the mention down to the ID.
            const userID = value.replace(/[^\d]/g, "");
            const { user } = await message.guild.members.fetch(userID);
            return user;
        } else {
            return message.channel.recipient;
        }
    }

    // idk what u want from me the parser fails if its invalid
    validate(): boolean {
        return true;
    }
}
