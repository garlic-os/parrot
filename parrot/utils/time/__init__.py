import datetime as dt

import pytz

from parrot.utils.types import Snowflake


def datetime2snowflake(datetime: dt.datetime) -> Snowflake:
	"""
	Convert a python datetime object to a Twitter Snowflake.

	https://github.com/client9/snowflake2time/
	Nick Galbreath @ngalbreath nickg@client9.com
	Uses machine timezone to normalize to UTC

	:param datetime: datetime (need not be timezone-aware)
	:returns: Twitter Snowflake encoding this time (UTC)
	"""
	timestamp = pytz.utc.localize(datetime).timestamp()
	return (int(round(timestamp * 1000)) - 1288834974657) << 22


def snowflake2datetime(snowflake: Snowflake) -> dt.datetime:
	"""
	https://github.com/client9/snowflake2time/
	Nick Galbreath @ngalbreath nickg@client9.com
	Uses machine timezone to normalize to UTC

	:param snowflake: Twitter Snowflake (UTC)
	:returns: datetime (UTC)
	"""
	timestamp = ((snowflake >> 22) + 1288834974657) / 1000.0
	return dt.datetime.fromtimestamp(timestamp, tz=dt.UTC)


# Difference measured between the timestamp encoded in a Discord ID and the real
# time it occurred
DISCORD_EVENT_TIME_CORRECTION = dt.timedelta(
	days=1518, seconds=80225, microseconds=343000
)


def id2datetime(discord_id: Snowflake) -> dt.datetime:
	"""Get the time and date an event from Discord occurred."""
	return snowflake2datetime(discord_id) + DISCORD_EVENT_TIME_CORRECTION


def datetime2id(datetime: dt.datetime) -> Snowflake:
	return datetime2snowflake(datetime - DISCORD_EVENT_TIME_CORRECTION)
