# Parrot
_Imitate everyone individually._

Parrot is a polymorphic Markov Chain generator for Discord that trains a unique 
model for each user. With a single bot, you can imitate a theoretically 
unlimited number of users. Once a user is registered, Parrot automatically 
learns how to speak like them through the messages they send. You can have 
Parrot imitate any registered user with the `|imitate` command.

Parrot uses Webhooks to take on the name and avatar of the person it's 
currently imitating. If you'd rather Parrot speak in a given channel without a 
Webhook, just take away its `manage_webhooks` permission there, and it will 
talk through an embed instead of a Webhook.

Parrot has to collect users' messages to work, so to ensure that no one's 
messages are collected without their consent, each user who wants Parrot to be 
able to imitate them must first register with Parrot through the `|register` 
command. After that though, it's simple to get started.

## Setup
For now, if you want Parrot on your server, you'll have to run it yourself.


1. [Create a Discord bot](https://discordpy.readthedocs.io/en/latest/discord.html) in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create an invite link with [these permissions](#permissions) and invite the bot to your server.
2. [Clone this repo.](https://docs.github.com/en/free-pro-team@latest/desktop/contributing-and-collaborating-using-github-desktop/cloning-a-repository-from-github-to-github-desktop)
3. Run [`poetry install`](https://python-poetry.org/docs/) in the project's directory.
4. Copy `config.example.py` to `config.py` and follow the [config documentation](#configuration) to fill in the needed information.
5. Change `privacy-policy.md` to fit your situation.
6. `$ python -m parrot.main`.


## Permissions
Parrot needs the following Bot Permissions:

**Required**
- Send Messages
- Read Message History (required for Quickstart)
Parrot also needs **Message Content intent**. Y'know. To learn from messages.

**Optional**
- Manage Webhooks - This permission lets Parrot use webhooks to mimick users' name and avatar. If not granted, Parrot will use a less-pretty embed instead.


## Configuration
Parrot needs a little information from you for it to start working.

**Required**
- `DISCORD_BOT_TOKEN` - The bot token generated for your copy of Parrot on the Discord Developer Portal.
- `ADMIN_USER_IDS` and/or `ADMIN_ROLE_IDS` - An array of IDs of the users or roles you want to give admin privileges to. Admins get access to commands for managing Parrot. For example, `[54757394934834985, 23947297429259834, 29797299597494445]`.

**Optional**
- `CHAIN_CACHE_SIZE` - How many Markov models to keep in memory at a time. Increasing this number will make Parrot take up (even) more RAM, while decreasing it will Parrot slower at imitating while increasing disk reads and CPU usage. Default is `5`.
- `COMMAND_PREFIX` - The character(s) that go before a Parrot command. Default is `"|"`.
- `DB_PATH` - Path to a sqlite3 database file to keep Parrot's data. If it doesn't exist, it will be created.
- `AUTOSAVE_INTERVAL_SECONDS` - How often to commit the database to disc. Parrot also saves before shutting down. Default is one hour—`3600`.
- `AYY_LMAO` - (((extremely important feature))) Set to `True` to make Parrot say "lmao" every time someone else says "ayy". Default is `False`.
