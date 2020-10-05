/**
 * Utility functions!
 */

import type { DMChannel, TextChannel, User } from "discord.js";
import type { EventEmitter } from "events";


// discord.js works in such a way that you have to do all this just to get the
//   nickname a user might or might not have.
// In discord.py, this all just happens automatically when you call .nickname.
export const resolveNickname = async (user: User, channel: TextChannel | DMChannel): Promise<string> => {
    if (channel.type === "text") {
        const member = await channel.guild.members.fetch(user.id);
        if (member) {
            return member.nickname || user.username;
        } else {
            console.debug("[*] Imitated a user who is not in this server. This is not supposed to happen.");
            return user.username;
        }
    } else {
        return user.username;
    }
};


// If a container of things, return the first element in that container.
// If not a container, just return the thing.
export const firstOf = (thing: any): any => {
    if (thing instanceof Array) {
        return thing[0];
    }
    return thing;
};


export const when = (eventEmitter: EventEmitter, eventName: string): Promise<any> => {
    return new Promise( (resolve) => {
        eventEmitter.once(eventName, resolve);
    });
};
