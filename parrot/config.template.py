import logging

from parrot.core.settings import Settings


# Python logging module configuration
# Example: log to console
logging.basicConfig(
	level=logging.INFO,
	format="%(levelname)-4s %(message)s",
)
# Example: log to a file at the project root
# import sys
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s %(levelname)-4s %(message)s",
#     datefmt="[%Y-%m-%d %H:%M:%S]",
#     handlers=[
#         logging.FileHandler("parrot.log", "a", "utf-8"),
#         logging.StreamHandler(sys.stdout),
#     ],
# )


# settings = Settings(
#     discord_bot_token=,
#     command_prefix=,
#     db_url=,
#     autosave_interval_seconds=,
#     admin_user_ids=,
#     admin_role_ids=,
#     avatar_store_channel_id=,
#     random_weasel_chance=,
#     enable_imitate_someone=,
#     ayy_lmao=,
# )
