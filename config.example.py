import logging
import sys
import os

# Discord bot token
DISCORD_BOT_TOKEN: str = ""

# Discord IDs
ADMIN_USER_IDS: list[int] = [
    206235904644349953,  # garlicOS®
]
ADMIN_ROLE_IDS: list[int] = [

]

# Either put this or "@parrot " before a command
COMMAND_PREFIX: str = "|"

# Number of Markov chain models to cache at once
MODEL_CACHE_SIZE: int = 5

# Path to a sqlite3 database file to keep Parrot's data;
# if it doesn't exist, it will be created
DB_PATH: str = os.path.join("database", "parrot.sqlite3")

# Number of seconds between database commits
AUTOSAVE_INTERVAL_SECONDS: int = 3600

# ID of the channel in which to cache modified avatars
AVATAR_STORE_CHANNEL_ID: int = 867573882608943127

# Whether or not to say "lmao" when someone says "ayy"
AYY_LMAO: bool = True

# Chance on [0, 1] to reply to a message with its content filtered through
# weasel.devolve
RANDOM_DEVOLVE_CHANCE: float = 0.005

# Enable the "|imitate someone" feature
# Requires Server Members Intent
ENABLE_IMITATE_SOMEONE: bool = True

# Python logging module configuration
# Example for logging to a file at the project root
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-4s %(message)s",
    datefmt="[%Y-%m-%d %H:%M:%S]",
    handlers=[
        logging.FileHandler("parrot.log", "a", "utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
# Example for use as a systemd service
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(levelname)-4s %(message)s",
# )
