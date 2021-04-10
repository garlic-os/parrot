from typing import List

import os
import logging
import ujson as json  # ujson is faster
from discord import Activity, ActivityType, AllowedMentions
from discord.ext import commands
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

prefix = os.environ.get("COMMAND_PREFIX", "|")

print("Initializing bot...")
bot = commands.AutoShardedBot(
    command_prefix=os.environ.get("COMMAND_PREFIX", "|"),
    owner_ids=json.loads(os.environ["OWNERS"]),
    case_insensitive=True,
    allowed_mentions=AllowedMentions.none(),
    activity=Activity(
        name=f"everyone ({prefix}help)",
        type=ActivityType.listening,
    )
)

bot.admin_role_ids = json.loads(os.environ.get("ADMIN_ROLE_IDS", "[]"))


def load_folder(folder_name: str) -> None:
    def list_filenames(directory: str) -> List[str]:
        files = []
        for filename in os.listdir(directory):
            abs_path = os.path.join(directory, filename)
            if os.path.isfile(abs_path):
                filename = os.path.splitext(filename)[0]
                files.append(filename)
        return files

    for module in list_filenames(folder_name):
        path = f"{folder_name}.{module}"
        try:
            print(f"Loading {path}... ", end="")
            bot.load_extension(path)
            print("✅")
        except Exception as e:
            print("❌")
            print(e, end="\n\n")


bot.load_extension("jishaku")
load_folder("cogs")
load_folder("events")
load_folder("commands")


print("Logging in...")
bot.run(os.environ["DISCORD_BOT_TOKEN"])
