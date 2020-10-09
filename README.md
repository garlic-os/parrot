# Parrot
_Imitate everyone individually._

Parrot is a a Markov-chain-based Discord bot that keeps a separate dataset for each user. With a single bot, you can imitate a theoretically unlimited number of users. Once a user is registered, Parrot automatically learns how to speak like them through the messages they send. You can have Parrot imitate any registered user with the `|imitate` command.

Parrot has to collect users' messages to work, so to ensure that no one's messages are collected without their consent, each user who wants Parrot to be able to imitate them must first register with Parrot through the `|register` command. After that though, you're on your way!

## Setup
For now, if you want Parrot on your server, you have to run it yourself.  
To keep things simple, I'm going to assume you already:
- know how to create a Discord bot in the Discord Developer Portal and get its Token
- have node.js installed

1. Download the repo and extract the project somewhere.
2. `npm install`.
3. Create a .env file in the project root (outside the "src/" folder).
4. Fill in the [environment variables](#environment-variables).
5. Locate "config.ts" inside of "src/" and follow the Config interface to configure Parrot for the channels you want it to be able to learn and speak in.
6. `npm start`.

## Environment Variables
**Required**
- `DISCORD_BOT_TOKEN` - The Bot Token generated for your copy of Parrot on the Discord Developer Portal.
- `COMMAND_PREFIX` - The character(s) you put before a Parrot command. I prefer "|" but it's completely up to you.
- `CACHE_SIZE` - How many Markov Chains to keep in memory at a time. I don't know why I made this a required variable just use like 5 or something idk

**Optional**
- `CORPUS_DIR` - A custom (relative) directory to store users' collected messages for Markov training data. Default is "corpora/" in the project root.
- `AYY_LMAO` - (((extremely important feature))) Set to "true" to make Parrot say "lmao" every time someone else says "ayy".
