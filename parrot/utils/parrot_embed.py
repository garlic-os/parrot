from enum import Enum

import discord


class ParrotEmbed(discord.Embed):
	"""
	A Discord Embed with extra features!
	Concepts stolen from crimsoBOT; copyright (c) 2019 crimso, williammck; MIT
	https://github.com/crimsobot/crimsoBOT/blob/master/crimsobot/utils/tools.py
	"""

	class Color(Enum):
		Default = 0xA755B5  # Pale purple
		Red = 0xB71C1C  # Deep, muted red
		Orange = 0xF4511E  # Deep orange. Reserved for BIG trouble.
		Green = 0x43A047  # Darkish muted green
		Gray = 0x9E9E9E  # Dead gray

	def __init__(self, color_name: Color = Color.Default, *args, **kwargs):
		kwargs["color"] = kwargs.get("color", color_name.value)
		super().__init__(*args, **kwargs)
