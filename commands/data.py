from typing import Dict
from utils.types import PendingConfirmations

import asyncio
import aiohttp
from discord.ext import commands
from utils.parrot_embed import ParrotEmbed
from utils.exceptions import NoDataError, UserPermissionError, UserNotFoundError
from utils.converters import Userlike


class Data(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.pending_confirmations: PendingConfirmations = {}


    @commands.command(aliases=["checkout"])
    @commands.cooldown(2, 3600, commands.BucketType.user)
    async def download(self, ctx: commands.Context) -> None:
        """ Download a copy of your data. """
        user = ctx.author

        try:
            corpus_file_path = self.bot.corpora.file_path(user)
        except FileNotFoundError:
            raise NoDataError(f"No data available for user {user.name}#{user.discriminator}.")

        # Upload to file.io, a free filesharing service where the file is
        #   deleted once it's downloaded.
        with open(corpus_file_path, "rb") as f:
            async with aiohttp.ClientSession() as session:
                async with session.post("https://file.io/", data={"file": f, "expiry": "6h"}) as response:
                    download_url = (await response.json())["link"]

        # DM the user their download link.
        embed_download_link = ParrotEmbed(
            title="Link to download your data",
            description=download_url,
        )
        embed_download_link.set_footer(text="Link expires in 6 hours.")
        await user.send(embed=embed_download_link)

        # Tell them to check their DMs.
        embed_download_ready = ParrotEmbed(
            title="Download ready",
            color_name="green",
            description="A link to download your data has been DM'd to you.",
        )
        await ctx.send(embed=embed_download_ready)


    @commands.group()
    @commands.cooldown(2, 5, commands.BucketType.user)
    async def forget(self, ctx: commands.Context, maybe_user: str, *args) -> None:
        """ Make Parrot delete all the data it has about you. """
        try:
            userlike = Userlike()
            user = await userlike.convert(ctx, maybe_user)
        except UserNotFoundError:
            for command in self.forget.commands:
                if command.name == maybe_user:
                    await command(ctx, *args)
                    return
            raise

        if user != ctx.author and ctx.author.id not in self.bot.owner_ids:
            raise UserPermissionError("You are not allowed to make Parrot forget other users.")

        if user not in self.bot.corpora:
            raise NoDataError(f"No data available for user {user.name}#{user.discriminator}.")

        confirmation_id = ctx.message.id

        # Keep track of this confirmation by storing some information about it
        #   in a dict.
        self.pending_confirmations[confirmation_id] = {
            "author": ctx.author,
            "corpus_owner": user,
        }

        embed = ParrotEmbed(
            author=user,
            title="Are you sure?",
            description=f"This will permantently delete the data of {user.name}#{user.discriminator}.\nTo make your choice, paste one of these two commands:",
            color_name="orange",
        )
        embed.add_field(
            name="✅ Confirm",
            value=f"{self.bot.command_prefix}forget confirm {confirmation_id}",
        )
        embed.add_field(
            name="❌ Cancel",
            value=f"{self.bot.command_prefix}forget cancel {confirmation_id}",
        )
        embed.set_footer(text="Confirmation will be automatically canceled in 1 minute.")

        await ctx.send(embed=embed)

        # Delete the confirmation after 1 minute.
        await asyncio.sleep(60)
        try:
            del self.pending_confirmations[confirmation_id]
        except KeyError:
            pass


    @forget.command(name="confirm", hidden=True)
    async def forget_confirm(self, ctx: commands.Context, confirmation_id: int) -> None:
        # You'd think that since this argument is typed as an int, it would be
        #   an int. But noooo, it's actually a string.
        confirmation_id = int(confirmation_id)
        confirmation = self.pending_confirmations.get(confirmation_id, None)
        
        confirmation_is_valid = (
            confirmation is not None and
            confirmation["author"] == ctx.author
        )

        if confirmation_is_valid:
            user = confirmation["corpus_owner"]
            del self.bot.corpora[user]
            del self.bot.chains[user]
            del self.pending_confirmations[confirmation_id]

            await ctx.send(embed=ParrotEmbed(
                author=user,
                title=f"Parrot has forgotten {user.name}#{user.discriminator}.",
                description="All of the data that Parrot has collected from this user has been deleted.",
                color_nane="gray",
            ))
        else:
            await ctx.send(f"Confirmation code \"{confirmation_id}\" is invalid.")


    @forget.command(name="cancel", hidden=True)
    async def forget_cancel(self, ctx: commands.Context, confirmation_id: int) -> None:
        confirmation_id = int(confirmation_id)
        confirmation = self.pending_confirmations.get(confirmation_id, None)
        
        confirmation_is_valid = (
            confirmation is not None and
            confirmation["author"] == ctx.author
        )

        if confirmation_is_valid:
            del self.pending_confirmations[confirmation_id]
            await ctx.send("Forget command canceled.")
        else:
            await ctx.send(f"Confirmation code \"{confirmation_id}\" is invalid.")


def setup(bot: commands.Bot) -> None:
    bot.add_cog(Data(bot))
