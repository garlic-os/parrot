from typing import Optional
from discord import Forbidden, HTTPException, Webhook
from discord.ext.commands import Context


async def fetch_webhook(ctx: Context) -> Optional[Webhook]:
    # See if Parrot owns a webhook for this channel.
    res = ctx.bot.db.execute(
        "SELECT webhook_id FROM channels WHERE id = ?",
        (ctx.channel.id,),
    ).fetchone()
    if res is not None and res[0] is not None:
        return await ctx.bot.fetch_webhook(res[0])

    # If not, create one.
    try:
        webhook = await ctx.channel.create_webhook(
            name=f"Parrot in #{ctx.channel.name}",
            avatar=(await ctx.bot.user.avatar.read()),
        )
        ctx.bot.db.execute(
            "UPDATE channels SET webhook_id = ? WHERE id = ?;",
            (webhook.id, ctx.channel.id)
        )
        return webhook
    except (Forbidden, HTTPException, AttributeError):
        # - Forbidden: Parrot lacks permission to make webhooks here.
        # - AttributeError: Cannot make a webhook in this type of channel, like
        # a DMChannel.
        # - HTTPException: something is very wrong
        return None
