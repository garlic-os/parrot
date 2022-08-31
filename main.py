import config
import os
import sys
import logging
import ujson as json  # ujson is faster
import sqlite3
import atexit
from dotenv import load_dotenv
from bot import Parrot

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-4s %(message)s",
    datefmt="[%Y-%m-%d %H:%M:%S]",
    handlers=[
        logging.FileHandler("parrot.log", "a", "utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)

logging.info("Logging into database...")
con = sqlite3.connect(os.path.join("database", "parrot.db"))


logging.info("Initializing bot...")
bot = Parrot(
    prefix=config.COMMAND_PREFIX,
    owner_ids=config.ADMIN_USER_IDS,
    admin_role_ids=config.ADMIN_ROLE_IDS,
    db=con.cursor(),
)

bot.run(config.DISCORD_BOT_TOKEN)
atexit.register(con.close)
