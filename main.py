import os
import sys
import logging
import ujson as json  # ujson is faster
from redis import Redis
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


logging.info("Initializing bot...")
bot = Parrot(
    prefix=os.environ.get("COMMAND_PREFIX", "|"),
    owner_ids=json.loads(os.environ["OWNERS"]),
    admin_role_ids=json.loads(os.environ.get("ADMIN_ROLE_IDS", "[]")),
    redis=Redis(
        host=os.environ["REDIS_HOST"],
        port=int(os.environ["REDIS_PORT"]),
        password=os.environ["REDIS_PASSWORD"],
    ),
)

bot.run(os.environ["DISCORD_BOT_TOKEN"])
