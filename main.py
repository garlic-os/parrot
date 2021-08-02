import config
import logging
from redis import Redis
from bot import Parrot

logging.info("Initializing bot...")
bot = Parrot(
    prefix=config.COMMAND_PREFIX,
    admin_user_ids=config.ADMIN_USER_IDS,
    redis=Redis(
        host=config.REDIS_HOST,
        port=config.REDIS_PORT,
        password=config.REDIS_PASSWORD,
        decode_responses=True,
    ),
)

bot.run(config.DISCORD_BOT_TOKEN)
