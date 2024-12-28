from parrot.core.types import Snowflake
from pydantic import BaseModel
from pydantic_settings import BaseSettings


class ImageSettings(BaseModel):
	max_filesize_bytes: int = 10 * 1024 * 1024  # 10 MB; Discord free tier size
	max_frames: int = 300


class Settings(BaseSettings):
	image: ImageSettings = ImageSettings()

	discord_bot_token: str

	# Put either this or "@parrot " before a command
	command_prefix: str = "|"

	db_url: str = "sqlite:////var/lib/parrot/db.sqlite3"

	# Seconds between database commits
	autosave_interval_seconds: int = 3600

	# Allow the cache of generated models to take up to this much space in
	# memory
	markov_cache_size_bytes: int = 1 * 1024 * 1024 * 1024  # 1 GB

	admin_user_ids: set[Snowflake] = {
		206235904644349953,  # garlicOS®
	}

	admin_role_ids: set[Snowflake] = set()

	# Discord channel where Parrot caches antiavatars
	avatar_store_channel_id: Snowflake

	# Random probability on [0, 1] to reply to a message with its content
	# filtered through `weasel.devolve`
	random_weasel_chance: float = 0.005

	# Enable the `|imitate someone` feature.
	# Requires Server Members intent
	enable_imitate_someone: bool = True

	ayy_lmao: bool = True
