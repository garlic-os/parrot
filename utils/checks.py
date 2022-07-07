from discord.ext import commands
import config


def is_owner(ctx: commands.Context) -> bool:
    """ Check if the context's author is an owner of Parrot. """
    return ctx.author.id in ctx.bot.owner_ids


def is_admin(ctx: commands.Context) -> bool:
    """ Check if the context's author is a Parrot administrator. """
    if is_owner(ctx):
        return True
    for role_id in map((lambda role: role.id), ctx.author.roles):
        if role_id in config.ADMIN_ROLE_IDS:
            return True
    return False
