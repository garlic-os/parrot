import re
from discord.ext import commands
from discord import User


class Userlike(commands.Converter):
    """
    A string that can resolve to a User.
    Works with:
      - Mentions, like <@394750023975409309> and <@!394750023975409309>
      - User IDs, like 394750023975409309
      - The string "me", which resolves to the context's author
    """

    async def convert(self, ctx: commands.Context, text: str) -> User:
        if text == "me":
            return ctx.author

        # Remove all non-numeric characters
        user_id = int(re.sub("[^0-9]", "", text))
        return await ctx.guild.get_member(user_id)
