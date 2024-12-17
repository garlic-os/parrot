from parrot.core.types import Snowflake
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
	discord_bot_token: str

	# Put either this or "@parrot " before a command
	command_prefix: str = "|"

	db_url: str = "sqlite:////var/lib/parrot/db.sqlite3"

	# Seconds between database commits
	autosave_interval_seconds: int = 3600

	admin_user_ids: set[Snowflake] = {
		206235904644349953,  # garlicOS®
	}

	admin_role_ids: set[Snowflake] = set()

	# Discord channel where Parrot caches modified avatars
	avatar_store_channel_id: Snowflake

	# Random probability on [0, 1] to reply to a message with its content
	# filtered through `weasel.devolve`
	random_weasel_chance: float = 0.005

	# Enable the `|imitate someone` feature.
	# Requires Server Members intent
	enable_imitate_someone: bool = True

	ayy_lmao: bool = True
