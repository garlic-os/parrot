from typing import Dict
from discord import Embed


class ParrotEmbed(Embed):
    colors: Dict[str, int] = {
        "default": 0xA755B5,  # Pale purple
        "red": 0xB71C1C,  # Deep, muted red
        "orange": 0xF4511E,  # Deep orange. Reserved for BIG trouble.
        "green": 0x43A047,  # Darkish muted green
        "gray": 0x9E9E9E,  # Dead gray
    }

    """
    A Discord Embed with extra features!
    Concepts stolen from crimsoBOT; copyright (c) 2019 crimso, williammck; MIT
    https://github.com/crimsobot/crimsoBOT/blob/master/crimsobot/utils/tools.py
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.ParrotEmbed_args = kwargs
        self.set_color_by_name()
        del self.ParrotEmbed_args

    def set_color_by_name(self) -> None:
        """ Set the embed's color by color_name if color is not defined. """
        """ If neither are defined, use the default color. """
        if self.color:  # Let color override color_name
            return

        color_name = self.ParrotEmbed_args.get("color_name", "default")
        self.color = ParrotEmbed.colors[color_name]

