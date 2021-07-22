from utils.parrot_markov import GibberishMarkov
from discord import AllowedMentions, User
from bot import Parrot

from discord.ext import commands
from utils.parrot_embed import ParrotEmbed
from utils.converters import Userlike
from utils.fetch_webhook import fetch_webhook
from utils import regex
import logging


class Text(commands.Cog):
    def __init__(self, bot: Parrot):
        self.bot = bot


    def discord_caps(self, text: str) -> str:
        """
        Capitalize a string in a way that remains friendly to URLs, emojis, and
        mentions.
        Made by Kaylynn: https://github.com/kaylynn234. Thank you, Kaylynn!
        """
        words = text.replace(r"*", "").split(" ")
        for i, word in enumerate(words):
            if regex.do_not_capitalize.match(word) is None:
                words[i] = word.upper()
        return " ".join(words)


    async def really_imitate(self, ctx: commands.Context, user: User, intimidate: bool=False) -> None:
        # Parrot can't imitate itself!
        # Send the funny XOK message instead, that'll show 'em.
        if user == self.bot.user:
            embed = ParrotEmbed(
                title="Error",
                color_name="red",
            )
            embed.set_thumbnail(url="https://i.imgur.com/zREuVTW.png")  # Windows 7 close button
            embed.set_image(url="https://i.imgur.com/JAQ7pjz.png")  # Xok
            sent_message = await ctx.send(embed=embed)
            await sent_message.add_reaction("🆗")
            return

        # Fetch this user's model.
        # May throw a NotRegistered or NoData error, which we'll just let the
        #   error handler deal with.
        model = self.bot.get_model(user)
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
        try:
            avatar_url = await self.bot.avatars.fetch(user)
        except Exception as error:
            logging.error(f"\n{error}\n{error.__traceback__}\n")
            avatar_url = user.avatar_url
        if webhook is None:
            # Fall back to using an embed if Parrot doesn't have manage_webhooks
            #   permission in this channel.
            await ctx.send(embed=ParrotEmbed(
                description=sentence,
            ).set_author(name=name, icon_url=avatar_url))
        else:
            # Send the sentence through the webhook.
            await webhook.send(
                content=sentence,
                username=name,
                avatar_url=avatar_url,
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
    async def gibberish(self, ctx: commands.Context, *, text: str=None) -> None:
        """
        Enter some text and turn it into gibberish. If you don't enter any text,
        Parrot will gibberize the last message send in this channel instead.
        """
        # If no text is provided, use the most recent message instead.
        if text is None:
            async for message in ctx.channel.history():
                content = message.content
                if len(content) > 0 and not content.startswith(self.bot.command_prefix):
                    text = content
                    break
                for embed in message.embeds:
                    desc = embed.description
                    if isinstance(desc, str) and len(desc) > 0:
                        text = desc

            if text is None:
                await ctx.send("😕 Couldn't find message to gibberize")
                return

        model = GibberishMarkov(text)
        await ctx.send(model.make_sentence())


def setup(bot: Parrot) -> None:
    bot.add_cog(Text(bot))
