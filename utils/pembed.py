from typing import Dict
from discord import Embed


class Pembed(Embed):
    """
    A Discord Embed with extra features!
    Concepts stolen from crimsoBOT; copyright (c) 2019 crimso, williammck; MIT
    https://github.com/crimsobot/crimsoBOT/blob/master/crimsobot/utils/tools.py
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.pembed_args = kwargs

        self.set_color_by_name()
        self.set_author_by_user()
        self.set_image_by_name()

        del self.pembed_args

    def set_color_by_name(self) -> None:
        """ Set the embed's color by color_name if color is not defined. """
        """ If neither are defined, use the default color. """
        if self.color:  # Let color override color_name
            return

        colors: Dict[str, int] = {
            "default": 0xA755B5,  # Pale purple
            "red": 0xB71C1C,  # Deep, muted red
            "orange": 0xF4511E,  # Deep orange. Reserved for BIG trouble.
            "green": 0x43A047,  # Darkish muted green
            "gray": 0x9E9E9E,  # Dead gray
        }

        color_name = self.pembed_args.get("color_name", "default")
        self.color = colors[color_name]

    def set_author_by_user(self) -> None:
        """ Set the embed's author by a DiscordUser. """
        author = self.pembed_args.get("author", None)

        if author:
            name = author.display_name
            icon_url = author.avatar_url_as(size=32)
            self.set_author(name=name, icon_url=icon_url)

    def set_image_by_name(self) -> None:
        """ Set the embed's image by the URL of the image. """
        url = self.pembed_args.get("image_url", None)

        if url:
            self.set_image(url=url)
