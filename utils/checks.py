from discord.ext import commands


def is_owner(ctx: commands.Context) -> bool:
    """ Check if the context's author is an owner of Parrot. """
    return ctx.author.id in ctx.bot.owner_ids


def is_admin(ctx: commands.Context) -> bool:
    """ Check if the context's author is a Parrot administrator. """
    # TODO: Add support for Parrot admin server roles
    # Is an owner of Parrot or the context's server
    return is_owner(ctx) or ctx.author.id == ctx.guild.owner_id
