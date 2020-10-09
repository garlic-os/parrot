import type { EventEmitter } from "events";

import { Collection, DMChannel, TextChannel, User } from "discord.js";
import * as regex from "./regex";


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
    if (thing instanceof Collection) {
        // Get the first element in the Collection that isn't undefined
        thing = thing.array();
        let lastElement: any;
        do {
            lastElement = thing.shift();
        } while (lastElement === undefined);
    
        return lastElement;
    }
    return thing;
};


// If a container of things, return the last element in that container.
// If not a container, just return the thing.
export const lastOf = (thing: any): any => {
    if (thing instanceof Array) {
        return thing[thing.length - 1];
    }
    if (thing instanceof Collection) {
        // Get the last element in the Collection that isn't undefined
        thing = thing.array();
        let lastElement: any;
        do {
            lastElement = thing.pop();
        } while (lastElement === undefined);
    
        return lastElement;
    }
    return thing;
};



export const when = (eventEmitter: EventEmitter, eventName: string): Promise<any> => {
    return new Promise( (resolve) => {
        eventEmitter.once(eventName, resolve);
    });
};


// Credit Michael Martin-Smucker
// https://stackoverflow.com/a/25352300
export const isAlphaNumeric = (text: string): boolean => {
    var code, i;
  
    for (i = 0; i < text.length; ++i) {
        code = text.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
                return false;
        }
    }
    return true;
};


// Overwrite a line in the console.
export const consoleUpdate = (text: string): void => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(text + "\n");
};


// Capitalize a string in a way that remains friendly to URLs and emoji strings.
// Made by Kaylynn: https://github.com/kaylynn234. Thank you, Kaylynn!
export const discordCaps = (text: string): string => {
    const pattern = regex.doNotCapitalize;

    const words = text.replace(/\*/g, "").split(" ");
    const output = [];
	for (const word of words) {
		if (pattern.test(word)) {
			output.push(word);
		} else {
			output.push(word.toUpperCase());
		}
	}

    return output.join(" ");
};
