from discord import AllowedMentions

from discord.ext import commands
from utils.parrot_embed import ParrotEmbed
from utils.converters import Userlike
from utils.fetch_webhook import fetch_webhook
from utils.gibberish import gibberish


class Text(commands.Cog):
    @commands.command(brief="Imitate someone.")
    @commands.cooldown(2, 2, commands.BucketType.user)
    async def imitate(self, ctx: commands.Context, user: Userlike) -> None:
        """ Imitate a registered user. """
        # Fetch this user's chain.
        # May throw a NotRegistered or NoData error, which we'll just let the
        #   error handler deal with.
        chain = ctx.bot.chains[user]
        sentence = chain.make_short_sentence(500) or "Error"

        # Prepare to send this sentence through a webhook.
        # Discord lets you change the name and avatar of a webhook account much
        #   faster than those of a bot/user account, which is crucial for
        #   imitating lots of users quickly.
        webhook = await fetch_webhook(ctx)
        if webhook is None:
            # Fall back to using an embed if Parrot doesn't have manage_webhooks
            #   permission in this channel.
            await ctx.send(embed=ParrotEmbed(
                author=user,
                description=sentence,
            ))
        else:
            # Send the sentence through the webhook.
            await webhook.send(
                content=sentence,
                username=f"Not {user.display_name}",
                avatar_url=user.avatar_url,
                allowed_mentions=AllowedMentions.none(),
            )


    @commands.command(
        aliases=["gibberize"],
        brief="Gibberize a sentence.",
    )
    @commands.cooldown(2, 2, commands.BucketType.user)
    async def gibberish(self, ctx: commands.Context, *, sentence: str=None) -> None:
        """
        Enter a sentence and turn it into gibberish. If you don't enter a
        sentence, Parrot will gibberize the last message instead.
        Powered by Thinkzone's Gibberish Generator:
        https://thinkzone.wlonk.com/Gibber/GibGen.htm
        """
        # If no sentence is provided, use the most recent message instead.
        if sentence is None:
            async for message in ctx.channel.history():
                if len(message.content) > 0:
                    sentence = message.content
                    break
            if sentence is None:
                await ctx.send("😕 Couldn't find message to gibberize")
                return

        await ctx.send(gibberish(sentence))


def setup(bot: commands.Bot) -> None:
    bot.add_cog(Text())
