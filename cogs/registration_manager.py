from discord import User
from discord.ext import commands
from utils.disk_set import DiskSet
from utils.exceptions import NotRegisteredError


class RegistrationManager(DiskSet[int]):
    def __init__(self, registration_path: str) -> None:
        super().__init__(registration_path)

    def verify(self, user: User) -> None:
        """
        Raise a NotRegisteredError exception if the user is not a bot and is
          not registered.
        """
        if not super().__contains__(user.id) and not user.bot:
            raise NotRegisteredError(f"User {user.name}#{user.discriminator} is not registered")


class RegistrationManagerCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        bot.registration = RegistrationManager("./data/registration.json")


def setup(bot: commands.Bot) -> None:
    bot.add_cog(RegistrationManagerCog(bot))
