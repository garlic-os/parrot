from discord import AllowedMentions, User

from discord.ext import commands
from utils.parrot_embed import ParrotEmbed
from utils.converters import Userlike
from utils.fetch_webhook import fetch_webhook
from utils.gibberish import gibberish
from utils import regex
import re


class Text(commands.Cog):
    def discord_caps(self, text: str) -> str:
        """
        Capitalize a string in a way that remains friendly to URLs, emojis, and
        mentions.
        Made by Kaylynn: https://github.com/kaylynn234. Thank you, Kaylynn!
        """
        words = text.replace(r"*", "").split(" ")
        for i, word in enumerate(words):
            if re.match(regex.do_not_capitalize, word) is None:
                words[i] = word.upper()
        return " ".join(words)


    async def really_imitate(self, ctx: commands.Context, user: User, intimidate: bool=False) -> None:
        # Parrot can't imitate itself!
        if user == ctx.bot.user:
            embed = ParrotEmbed(
                title="Error",
                color_name="red",
            )
            embed.set_thumbnail(url="https://i.imgur.com/zREuVTW.png")
            embed.set_image(url="https://i.imgur.com/JAQ7pjz.png")  # Xok
            sent_message = await ctx.send(embed=embed)
            await sent_message.add_reaction("🆗")
            return

        # Fetch this user's model.
        # May throw a NotRegistered or NoData error, which we'll just let the
        #   error handler deal with.
        model = ctx.bot.model_cache[user]
        sentence = model.make_short_sentence(500) or "Error"
        name = f"Not {user.display_name}"

        if intimidate:
            sentence = "**" + self.discord_caps(sentence) + "**"
            name = name.upper()
            

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
                username=name,
                avatar_url=user.avatar_url,
                allowed_mentions=AllowedMentions.none(),
            )

    @commands.command(brief="Imitate someone.")
    @commands.cooldown(2, 2, commands.BucketType.user)
    async def imitate(self, ctx: commands.Context, user: Userlike) -> None:
        """ Imitate a registered user. """
        await self.really_imitate(ctx, user, intimidate=False)

    @commands.command(brief="IMITATE SOMEONE.", hidden=True)
    @commands.cooldown(2, 2, commands.BucketType.user)
    async def intimidate(self, ctx: commands.Context, user: Userlike) -> None:
        """ IMITATE A REGISTERED USER. """
        await self.really_imitate(ctx, user, intimidate=True)


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
                content = message.content
                if len(content) > 0 and not content.startswith(ctx.bot.command_prefix):
                    sentence = content
                    break
                for embed in message.embeds:
                    desc = embed.description
                    if isinstance(desc, str) and len(desc) > 0:
                        sentence = desc

            if sentence is None:
                await ctx.send("😕 Couldn't find message to gibberize")
                return

        await ctx.send(gibberish(sentence))


def setup(bot: commands.Bot) -> None:
    bot.add_cog(Text())
