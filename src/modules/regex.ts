// Any character Discord uses for Markdown.
export const markdown = /[*_`~]/;

// Any character that can be the beginning of a special string in Discord.
export const discordStringBeginning = /[<@:]/;

// Things that should not be capitalized:
// - emojis (start with < and end with >)
// - URLs (contain '://' somewhere in the middle)
export const doNotCapitalize = /(^<.*>$)|(^.+:\/\/.+$)/;
