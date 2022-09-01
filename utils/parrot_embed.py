from typing import Dict
from discord import Embed


class ParrotEmbed(Embed):
    """
    A Discord Embed with extra features!
    Concepts stolen from crimsoBOT; copyright (c) 2019 crimso, williammck; MIT
    https://github.com/crimsobot/crimsoBOT/blob/master/crimsobot/utils/tools.py
    """
    colors: Dict[str, int] = {
        "default": 0xA755B5,  # Pale purple
        "red": 0xB71C1C,  # Deep, muted red
        "orange": 0xF4511E,  # Deep orange. Reserved for BIG trouble.
        "green": 0x43A047,  # Darkish muted green
        "gray": 0x9E9E9E,  # Dead gray
    }

    def __init__(self, **kwargs):
        if self.color is None:
            color_name = kwargs.get("color_name", "default")
            kwargs["color"] = ParrotEmbed.colors[color_name]
            kwargs.pop("color_name", None)
        super().__init__(**kwargs)
