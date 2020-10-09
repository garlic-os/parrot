/**
 * All of Parrot's embeds are consolidated here.
 */
import type { EmbedField, Guild, User } from "discord.js";
import type { ErrorLike } from "..";

import { colors } from "../modules/colors";
import { config } from "../../config";
import { ParrotEmbed } from "./parrot-embed";
import * as fs from "fs";
import * as path from "path";

const prefix = process.env.COMMAND_PREFIX;
const policyPath = path.join(__dirname, "../../privacy-policy.txt");
const policyText = fs.readFileSync(policyPath, "utf-8");


export const registrationSuccess = new ParrotEmbed({
    title: "✅ Registered!",
    color: colors.green,
    description: "Now Parrot can start learning your speech patterns and imitate you.",
    fields: [
        {
            name: "Tip:",
            value: "If this is your first time registering (or if you deleted your data recently), you might want to consider running the \`quickstart\` command to immediately give Parrot a dataset to imitate you from. This will scan your past messages to create a model of how you speak, so you can start using Parrot right away.",
        },
    ],
    footer: {
        text: `${prefix}quickstart`,
    },
});


export const unregistrationSuccess = new ParrotEmbed({
    title: "Unregistered!",
    color: colors.gray,
    description: `Parrot will no longer be able to imitate you, and it has stopped collecting your messages.\n\n_If you're done with Parrot and don't want it to have your messages anymore, or if you just want a fresh start, you can do \`${prefix}forget me\` and your data will be permanently deleted from Parrot's datastore._`,
});


export const policy = new ParrotEmbed({
    title: "Privacy Policy",
    color: colors.purple,
    description: policyText,
    footer: {
        text: `${prefix}register • ${prefix}unregister`,
    },
});


export const notRegistered = new ParrotEmbed({
    title: "Not registered",
    color: colors.red,
    description: "That user isn't registered yet. They need to do that before Parrot can collect their messages and imitate them.",
});


export const notRegisteredMe = new ParrotEmbed({
    title: "Whoa, sod buster!",
    color: colors.red,
    description: `You aren't registered with Parrot yet. You need to do that before Parrot can collect your messages or imitate you.\nTo get started, read the privacy policy (\`${prefix}policy\`) then register with \`${prefix}register\`.`,
});


export const quickstartWindowPassed = new ParrotEmbed({
    title: "You're already started!",
    color: colors.red,
    description: "You are no longer eligible for quickstart because Parrot has already recorded more than 100 of your messages.",
});


export const noQuickstartInDMs = new ParrotEmbed({
    title: "Quickstart not available here",
    color: colors.red,
    description: `Quickstart is only available in servers. Try running \`${prefix}quickstart\` again in a server that Parrot is in.`,
});


export const downloadReady = new ParrotEmbed({
    title: "Download ready",
    color: colors.green,
    description: "A link to download your data has been DM'd to you.",
});


export const youAreRegistered = new ParrotEmbed({
    title: "✅ You are registered.",
    color: colors.purple,
    description: "Parrot can learn from your messages and imitate you.",
});


export const youAreNotRegistered = new ParrotEmbed({
    title: "❌ You are not registered.",
    color: colors.purple,
    description: "Parrot can not learn from your messages and imitate you.",
});


export const forgetPermissionDenied = new ParrotEmbed({
    title: "Verboten",
    color: colors.red,
    description: "You may not make Parrot forget anyone but yourself.",
});


export const dataDownloadLink = (url: string) => {
    return new ParrotEmbed({
        title: "Link to download your data",
        color: colors.purple,
        description: url,
        footer: {
            text: "Link expires in 6 hours.",
        },
    });
};


export const forgot = ({ tag, username }: User) => {
    return new ParrotEmbed({
        title: `Forgot ${tag}.`,
        color: colors.gray,
        description: `${username}'s data has been deleted from Parrot's datastore. Parrot will not be able to imitate this user until they post more messages or do \`${prefix}quickstart\` again.`,
    });
};


export const errorMessage = (err: ErrorLike) => {
    if (typeof err !== "string") {
        err = err.message;
    }
    
    return new ParrotEmbed({
        title: "Error",
        color: colors.red,
        description: err,
    });
};


export const noData = ({ username }: User) => {
    return new ParrotEmbed({
        title: "who are you",
        color: colors.red,
        description: `No data available for user ${username}.`,
    });
};


export const speakingIn = (guild: Guild) => {
    const fields: EmbedField[] = [];
    for (const channelID of Object.keys(config.speakingChannels)) {
        fields.push(            {
            name: "​", // cheeky zero width space for an empty name
            value: `<#${channelID}>`,
            inline: true,
        });
    }

    return new ParrotEmbed({
        title: "Parrot can speak in these channels:",
        fields,
    });
};


export const learningIn = (guild: Guild) => {
    const fields: EmbedField[] = [];
    for (const channelID of Object.keys(config.learningChannels)) {
        fields.push(            {
            name: "​", // cheeky zero width space for an empty name
            value: `<#${channelID}>`,
            inline: true,
        });
    }

    return new ParrotEmbed({
        title: "Parrot can learn in these channels:",
        fields,
    });
};


export const quickstartChoices = (guild: Guild) => {
    return new ParrotEmbed({
        title: "Quickstart Channels",
        color: colors.purple,
        description: `Quickstart is available in channels where Parrot can learn from your messages. Try running \`${prefix}quickstart\` again in one of these channels:`,
        fields: learningIn(guild).fields,
    });
};
