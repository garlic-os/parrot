# Parrot
_Imitate everyone individually._

Parrot is a a Markov-chain-based Discord bot that keeps a separate dataset for each user. With a single bot, you can imitate a theoretically unlimited number of users. Once a user is registered, Parrot automatically learns how to speak like them through the messages they send. You can have Parrot imitate any registered user with the `|imitate` command.

Parrot uses Webhooks to take on the name and avatar of the person it's currently imitating. If you'd rather Parrot speak in a given channel without a Webhook, just don't supply Webhook information for that channel and Parrot's `|imitate` output will be through embeds instead of a Webhook.

Parrot has to collect users' messages to work, so to ensure that no one's messages are collected without their consent, each user who wants Parrot to be able to imitate them must first register with Parrot through the `|register` command. After that though, you're on your way!

## Setup
For now, if you want Parrot on your server, you have to run it yourself.  
I'm going to assume you have already:
- created a Discord bot in the Discord Developer Portal and you have its Token onhand
- enabled Developer Mode in Discord's settings (to get user and channel IDs)
- installed node.js

1. Download the repo and extract the project somewhere.
2. `npm install`.
3. Create a copy of "defaults.ts" called "config.ts" inside of "src/", then follow the [config documentation](#configuration) to configure Parrot.
4. `npm start`.
5. Change the user ID in `privacy-policy.txt` with yours, or whomever will host the bot.

## Configuration
**Required**
- `discordBotToken` - The Bot Token generated for your copy of Parrot on the Discord Developer Portal.
- `learningChannels` - A dictionary of key-value pairs for channels Parrot can learn in, keys being the channel IDs and the values being human-readable comments/names for those channels.
- `speakingChannels` - A dictionary of key-value pairs for channels Parrot can speak in, keys being the channel IDs and the values being data for Parrot to speak through a Webhook in that channel.
- `owners` - An array of the user IDs of the people you want to give Owner priveleges to. Owners get access to commands for managing Parrot.

**Optional**
- `cacheSize` - How many Markov Chains to keep in memory at a time. Increasing this number will make Parrot take up (even) more RAM, while decreasing it might make Parrot slower at imitating while increasing disk reads and CPU usage. Default is `5`.
- `commandPrefix` - The character(s) that go before a Parrot command. Default is `"|"`.
- `corpusDir` - A custom directory to store users' collected messages for Markov training data. Default is `"corpora/"` inside the project root.
- `ayyLmao` - (((extremely important feature))) Set to `true` to make Parrot say "lmao" every time someone else says "ayy". Default is `false`.
