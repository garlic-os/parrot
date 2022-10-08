from typing import Optional
from discord import Forbidden, HTTPException, NotFound, Webhook
from discord.ext import commands


async def fetch_webhook(ctx: commands.Context) -> Optional[Webhook]:
    # See if Parrot owns a webhook for this channel.
    res = ctx.bot.db.execute(
        "SELECT webhook_id FROM channels WHERE id = ?",
        (ctx.channel.id,),
    ).fetchone()
    if res is not None and res[0] is not None:
        try:
            return await ctx.bot.fetch_webhook(res[0])
        except NotFound:
            # Saved webhook ID is invalid; make a new one
            pass

    # Parrot does not have a webhook for this channel, so create one.
    try:
        webhook = await ctx.channel.create_webhook(
            name=f"Parrot in #{ctx.channel.name}",
            avatar=(await ctx.bot.user.display_avatar.read()),
            reason="Automatically created by Parrot",
        )
        ctx.bot.db.execute(
            "UPDATE channels SET webhook_id = ? WHERE id = ?;",
            (webhook.id, ctx.channel.id)
        )
        return webhook
    except (Forbidden, HTTPException, AttributeError):
        # - Forbidden: Parrot lacks permission to make webhooks here.
        # - AttributeError: Cannot make a webhook in this type of channel, like
        #   a DMChannel.
        # - HTTPException: 400 Bad Request; there is already the maximum number
        #   of webhooks allowed in this channel (10).
        return None
