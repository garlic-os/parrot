from typing import Dict, Optional
from discord import TextChannel, Webhook

from discord.ext import commands


def bot_has_permissions(ctx: commands.Context, **perms: Dict[str, bool]) -> bool:
    guild = ctx.guild
    me = guild.me if guild is not None else ctx.bot.user
    permissions = ctx.channel.permissions_for(me)

    for perm, value in perms.items():
        if getattr(permissions, perm) != value:
            return False
    return True


async def fetch_webhook(ctx: commands.Context, channel: TextChannel=None) -> Optional[Webhook]:
    if channel is None:
        channel = ctx.channel

    if bot_has_permissions(ctx, manage_webhooks=False):
        return None

    # Try to find a webhook in this channel that Parrot has created before.
    for webhook in (await ctx.channel.webhooks()):
        if webhook.user == ctx.bot.user:
            return webhook

    # Otherwise, create a new one.
    return await ctx.channel.create_webhook(
        name=f"Parrot in #{ctx.channel.name}",
        avatar=(await ctx.bot.user.avatar_url.read()),
    )
