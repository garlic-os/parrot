import asyncio
import logging
import traceback
from typing import Awaitable, Callable

from discord import AllowedMentions, User
from bot import Parrot

from discord.ext import commands
from utils import fetch_webhook, GibberishMarkov, ParrotEmbed, regex, weasel
from utils.converters import FuzzyUserlike
from utils.exceptions import FriendlyError


class Text(commands.Cog):
    def __init__(self, bot: Parrot):
        self.bot = bot


    def discord_caps(self, text: str) -> str:
        """
        Capitalize a string in a way that remains friendly to URLs, emojis, and
        mentions.
        Made by Kaylynn: https://github.com/kaylynn234. Thank you, Kaylynn!
        """
        words = text.replace("*", "").split(" ")
        for i, word in enumerate(words):
            if regex.do_not_capitalize.match(word) is None:
                words[i] = word.upper()
        return " ".join(words)


    async def really_imitate(
        self,
        ctx: commands.Context,
        user: User,
        intimidate: bool=False
    ) -> None:
        # Parrot can't imitate itself!
        if user == self.bot.user:
            # Send the funny XOK message instead, that'll show 'em.
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
        # error handler deal with.
        model = await self.bot.get_model(user)
        sentence = model.make_short_sentence(500) or "Error"

        prefix, suffix = self.bot.get_guild_prefix_suffix(ctx.guild.id)
        name = f"{prefix}{user.display_name}{suffix}"

        if intimidate:
            sentence = "**" + self.discord_caps(sentence) + "**"
            name = name.upper()

        # Prepare to send this sentence through a webhook.
        # Discord lets you change the name and avatar of a webhook account much
        # faster than those of a bot/user account, which is crucial for
        # imitating lots of users quickly.
        try:
            avatar_url = await self.bot.avatars.fetch(user)
        except Exception as error:
            logging.error("\n".join(traceback.format_exception(None, error, error.__traceback__)))
            avatar_url = user.display_avatar.url

        webhook = await fetch_webhook(ctx)
        if webhook is None:
            # Fall back to using an embed if Parrot doesn't have an webhook and
            # couldn't make one.
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


    @commands.command(
        aliases=["be"],
        brief="Imitate someone."
    )
    @commands.cooldown(2, 2, commands.BucketType.user)
    async def imitate(self, ctx: commands.Context, user: FuzzyUserlike) -> None:
        """ Imitate someone. """
        logging.info(f"Imitating {user}")
        await self.really_imitate(ctx, user, intimidate=False)

    @commands.command(brief="IMITATE SOMEONE.", hidden=True)
    @commands.cooldown(2, 2, commands.BucketType.user)
    async def intimidate(self, ctx: commands.Context, user: FuzzyUserlike) -> None:
        """ IMITATE SOMEONE. """
        logging.info(f"Intimidating {user}")
        await self.really_imitate(ctx, user, intimidate=True)


    async def _modify_text(
        self,
        ctx: commands.Context,
        *,
        input_text: str="",
        modifier: Callable[[str], Awaitable[str]]
    ) -> None:
        """Generic function for commands that just modify text.
        
        Tries really hard to find text to work with then processes it with your
        callback.
        """
        # If the author is replying to a message, add that message's text
        # to anything the author might have also said after the command.
        if ctx.message.reference and ctx.message.reference.message_id:
            reference_message = await ctx.channel.fetch_message(
                ctx.message.reference.message_id
            )
            input_text += self.bot.find_text(reference_message)
            if len(input_text) == 0:
                # Author didn't include any text of their own, and the message
                # they're trying to get text from doesn't have any text.
                raise FriendlyError("😕 That message doesn't have any text!")

        # If there is no text and no reference message, try to get the text from
        # the last (usable) message sent in this channel.
        elif len(input_text) == 0:
            history = ctx.channel.history(limit=10, before=ctx.message)
            while len(input_text) == 0:
                try:
                    input_text += self.bot.find_text(await history.__anext__())
                except StopAsyncIteration:
                    raise FriendlyError(
                        "😕 Couldn't find a gibberizeable message"
                    )

        async with asyncio.timeout(5):
            text = await modifier(input_text)
        await ctx.send(text[:2000])


    @commands.command(
        aliases=["gibberize"],
        brief="Gibberize a sentence.",
    )
    @commands.cooldown(2, 2, commands.BucketType.user)
    async def gibberish(self, ctx: commands.Context, *, text: str="") -> None:
        """
        Enter some text and turn it into gibberish. If you don't enter any text,
        Parrot gibberizes the last message sent in this channel.
        You can also reply to a message and Parrot will gibberize that.
        """
        async def gibberizer(text: str) -> str:
            model = await GibberishMarkov.new(text)
            # Generate gibberish;
            # try up to 10 times to make it not the same as the source text.
            old_text = text
            for _ in range(10):
                text = model.make_sentence()
                if text != old_text:
                    break
            return text

        await self._modify_text(ctx, input_text=text, modifier=gibberizer)


    @commands.command(brief="Devolve a sentence.")
    @commands.cooldown(2, 2, commands.BucketType.user)
    async def devolve(self, ctx: commands.Context, *, text: str="") -> None:
        """
        Enter some text and devolve it back toward primordial ooze.
        If you don't enter any text, Parrot devolves the last message sent in
        this channel. You can also reply to a message and Parrot will devolve
        that.
        """
        await self._modify_text(ctx, input_text=text, modifier=weasel.devolve)


    @commands.command(brief="Wawa a sentence.", aliases=["stowaway"])
    @commands.cooldown(2, 2, commands.BucketType.user)
    async def wawa(self, ctx: commands.Context, *, text: str="") -> None:
        """
        Enter some text and have it be repeated back to you by the stowaway.
        If you don't enter any text, Parrot wawas the last message sent in
        this channel. You can also reply to a message and Parrot will wawa
        that.
        """
        await self._modify_text(ctx, input_text=text, modifier=weasel.wawa)


async def setup(bot: Parrot) -> None:
    await bot.add_cog(Text(bot))
