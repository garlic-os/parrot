from typing import Set
import logging
import sys


# Discord bot token
DISCORD_BOT_TOKEN: str = ""

# Discord IDs
ADMIN_USER_IDS: Set[int] = {
    206235904644349953,  # garlicOS®
}
ADMIN_ROLE_IDS: Set[int] = set()
# ADMIN_ROLE_IDS: Set[int] = {

# }

# Either put this or "@parrot " before a command
COMMAND_PREFIX: str = "|"

# Number of Markov chain models to cache at once
MODEL_CACHE_SIZE: int = 5

# Whether or not to say "lmao" when someone says "ayy"
AYY_LMAO: bool = True

# Redis database credentials
REDIS_HOST: str = ""
REDIS_PORT: int = 0
REDIS_PASSWORD: str = ""

# Python logging module configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-4s %(message)s",
    datefmt="[%Y-%m-%d %H:%M:%S]",
    handlers=[
        logging.FileHandler("parrot.log", "a", "utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
