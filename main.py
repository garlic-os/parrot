import logging
import config
import atexit
from bot import Parrot

logging.info("Initializing bot...")
bot = Parrot(
    prefix=config.COMMAND_PREFIX,
    db_path=config.DB_PATH,
    admin_user_ids=config.ADMIN_USER_IDS,
)

bot.run(config.DISCORD_BOT_TOKEN)


# Make absolutely sure Parrot gets a chance to gracefully shut down
@atexit.register
def on_exit() -> None:
    del bot
