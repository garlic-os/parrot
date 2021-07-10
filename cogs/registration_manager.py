from typing import Union
from discord import User, Member
from discord.ext.commands import Cog
from bot import Parrot
from utils.disk_set import DiskSet
from exceptions import NotRegisteredError


class RegistrationManager(DiskSet[int]):
    def __init__(self, bot: Parrot, registration_path: str):
        super().__init__(registration_path)
        self.bot = bot

    def verify(self, user: Union[User, Member]) -> None:
        """
        Raise a NotRegisteredError exception if the user is not a bot and is
          not registered.
        """
        if not super().__contains__(user.id) and not user.bot:
            raise NotRegisteredError(f"User {user} is not registered. To register, read the privacy policy with `{self.bot.command_prefix}policy`, then register with `{self.bot.command_prefix}register`.")


class RegistrationManagerCog(Cog):
    def __init__(self, bot: Parrot):
        bot.registration = RegistrationManager(bot, "./data/registration.json")


def setup(bot: Parrot) -> None:
    bot.add_cog(RegistrationManagerCog(bot))
