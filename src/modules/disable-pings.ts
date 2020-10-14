import type { DMChannel, TextChannel } from "discord.js";
import { MessageMentions } from "discord.js";


// Parse <@681321867746128746>-type mentions into @user#1234-type mentions, for
//   roles and users, so that they won't ping people.
export const disablePings = async (text: string, channel: DMChannel | TextChannel): Promise<string> => {
    if (channel.type === "text") {
        text = await replaceAsync(text, MessageMentions.USERS_PATTERN, async (mention: string): Promise<string> => {
            const userID = mention.replace(/\D/g, "");
            const { user } = await channel.guild.members.fetch(userID);
            return "@" + user.username;
        });
        text = await replaceAsync(text, MessageMentions.ROLES_PATTERN, async (mention: string): Promise<string> => {
            const roleID = mention.replace(/\D/g, "");
            const role = await channel.guild.roles.fetch(roleID);
            let result = "deleted-role";
            if (role) {
                result = role.name;
            }
            return "@" + result;
        });
    }
    else {
        text = text.replace(MessageMentions.USERS_PATTERN, "@" + channel.recipient);
    }

    return text
};


interface AsyncReplacer {
    (substring: string): Promise<string>;
}


/**
 * An asynchronous version of String.prototype.replace().
 * Created by Overcl9ck on StackOverflow:
 * https://stackoverflow.com/a/48032528
 */
const replaceAsync = async (text: string, target: string | RegExp, replace: AsyncReplacer): Promise<string> => {
    const replaced: string[] = [];
    const matches = text.match(target);
    if (!matches) {
        // im so tired
        return "";
    }
    for (const match of matches) {
        replaced.push(await replace(match));
    }
    return text.replace(target, () => {
        return String(replaced.shift());
    });
};
