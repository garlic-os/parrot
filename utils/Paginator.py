"""
A fork of DiscordUtils.Paginator.CustomEmbedPaginator
Copyright (c) 2018 toxicrecker, MIT License
https://github.com/toxicrecker/DiscordUtils/blob/master/DiscordUtils/Pagination.py
"""

from typing import Dict, List, Tuple, Union
from discord import Embed, Emoji, PartialEmoji, Reaction, User, Member
from discord.abc import Messageable
from discord.ext import commands

import asyncio
import math

Emojilike = Union[Emoji, Reaction, PartialEmoji, str]


class CustomEmbedPaginator:
    def __init__(self, ctx: commands.Context, **kwargs) -> None:
        self.embeds = None
        self.ctx = ctx
        self.bot = ctx.bot
        self.timeout = int(kwargs.get("timeout", 60))
        self.current_page = 0
        self.control_emojis: List[Emojilike] = []
        self.control_commands: List[str] = []
        self.auto_footer = kwargs.get("auto_footer", False)
        self.remove_reactions = kwargs.get("remove_reactions", False)

    def add_reaction(self, emoji: Emojilike, command: str) -> None:
        self.control_emojis.append(emoji)
        self.control_commands.append(command)

    def insert_reaction(self, index: int, emoji: Emojilike, command: str) -> None:
        self.control_emojis.insert(index, emoji)
        self.control_commands.insert(index, command)

    def remove_reaction(self, emoji: Emojilike) -> None:
        if emoji in self.control_emojis:
            index = self.control_emojis.index(emoji)
            self.control_emojis.remove(emoji)
            self.control_commands.pop(index)

    def remove_reaction_at(self, index: int) -> None:
        if index > len(self.control_emojis) - 1:
            index = len(self.control_emojis) - 1
        elif index < 0:
            index = 0
        try:
            self.control_emojis.pop(index)
            self.control_commands.pop(index)
        except:
            pass

    def clear_reactions(self) -> None:
        self.control_emojis = []
        self.control_commands = []

    async def run(self, embeds: List[Embed], send_to: Messageable=None) -> None:
        self.embeds = embeds
        if not send_to:
            send_to = self.ctx
        wait_for = self.ctx.author if send_to == self.ctx else send_to
        if self.auto_footer:
            self.embeds[0].set_footer(
                text=f"({self.current_page+1}/{len(self.embeds)})"
            )
        msg = await send_to.send(embed=self.embeds[0])
        for emoji in self.control_emojis:
            await msg.add_reaction(emoji)
        msg = await msg.channel.fetch_message(msg.id)

        def check(reaction: Reaction, user: Union[User, Member]) -> bool:
            return (
                user == wait_for
                and reaction.message.id == msg.id
                and str(reaction.emoji) in self.control_emojis
            )

        while True:
            if self.timeout > 0:
                try:
                    # Wait for the target user to add a reaction.
                    reaction, user = await self.bot.wait_for(
                        "reaction_add", check=check, timeout=self.timeout
                    )
                except asyncio.TimeoutError:
                    for reaction in msg.reactions:
                        if (
                            reaction.message.author.id == self.bot.user.id
                            and self.remove_reactions
                        ):
                            await msg.remove_reaction(
                                str(reaction.emoji), reaction.message.author
                            )
                    self.current_page = 0
                    return msg
                    break
            else:
                reaction, user = await self.bot.wait_for(
                    "reaction_add", check=check
                )
            for emoji in self.control_emojis:
                if emoji == str(reaction.emoji):
                    index = self.control_emojis.index(emoji)
                    cmd = self.control_commands[index]
                    if cmd.lower() == "first":
                        self.current_page = 0
                        if self.remove_reactions:
                            await msg.remove_reaction(str(reaction.emoji), user)
                        if self.auto_footer:
                            self.embeds[0].set_footer(
                                text=f"({self.current_page+1}/{len(self.embeds)})"
                            )
                        await msg.edit(embed=self.embeds[0])
                    elif cmd.lower() == "last":
                        self.current_page = len(self.embeds) - 1
                        if self.remove_reactions:
                            await msg.remove_reaction(str(reaction.emoji), user)
                        if self.auto_footer:
                            self.embeds[len(self.embeds) - 1].set_footer(
                                text=f"({self.current_page+1}/{len(self.embeds)})"
                            )
                        await msg.edit(embed=self.embeds[len(self.embeds) - 1])
                    elif cmd.lower() == "next":
                        self.current_page += 1
                        self.current_page = (
                            len(self.embeds) - 1
                            if self.current_page > len(self.embeds) - 1
                            else self.current_page
                        )
                        if self.remove_reactions:
                            await msg.remove_reaction(str(reaction.emoji), user)
                        if self.auto_footer:
                            self.embeds[self.current_page].set_footer(
                                text=f"({self.current_page+1}/{len(self.embeds)})"
                            )
                        await msg.edit(embed=self.embeds[self.current_page])
                    elif cmd.lower() == "back":
                        self.current_page = self.current_page - 1
                        self.current_page = (
                            0 if self.current_page < 0 else self.current_page
                        )
                        if self.remove_reactions:
                            await msg.remove_reaction(str(reaction.emoji), user)
                        if self.auto_footer:
                            self.embeds[self.current_page].set_footer(
                                text=f"({self.current_page+1}/{len(self.embeds)})"
                            )
                        await msg.edit(embed=self.embeds[self.current_page])
                    elif cmd.lower() == "delete":
                        self.current_page = 0
                        await msg.delete()
                        return msg
                        break
                    elif cmd.lower() == "clear" or cmd.lower() == "lock":
                        self.current_page = 0
                        for reaction in msg.reactions:
                            if reaction.message.author.id == self.bot.user.id:
                                await msg.remove_reaction(
                                    str(reaction.emoji), reaction.message.author
                                )
                        return msg
                        break
                    elif cmd.startswith("page"):
                        shit = cmd.split()
                        pg = int(shit[1])
                        self.current_page = pg
                        if pg > len(embeds) - 1:
                            pg = len(embeds) - 1
                        if pg < 0:
                            pg = 0
                        if self.remove_reactions:
                            await msg.remove_reaction(str(reaction.emoji), user)
                        if self.auto_footer:
                            self.embeds[self.current_page].set_footer(
                                text=f"({pg+1}/{len(self.embeds)})"
                            )
                        await msg.edit(embed=self.embeds[pg])
                    elif cmd.startswith("remove"):
                        things = cmd.split()
                        things.pop(0)
                        something = things[0]
                        if something.isdigit():
                            index = int(something)
                            index = (
                                len(self.control_emojis) - 1
                                if index > len(self.control_emojis) - 1
                                else index
                            )
                            index = 0 if index < 0 else index
                            emoji = self.control_emojis[index]
                            if self.remove_reactions:
                                await msg.remove_reaction(str(reaction.emoji), user)
                            await msg.remove_reaction(emoji, self.bot.user)
                            self.control_emojis.pop(index)
                            self.control_commands.pop(index)
                        else:
                            emoji = something
                            if emoji in self.control_emojis:
                                if self.remove_reactions:
                                    await msg.remove_reaction(str(reaction.emoji), user)
                                await msg.remove_reaction(emoji, self.bot.user)
                                index = self.control_emojis.index(emoji)
                                self.control_emojis.remove(emoji)
                                self.control_commands.pop(index)


class FromList(CustomEmbedPaginator):
    def __init__(self, ctx: commands.Context, entries: List[Union[str, Tuple[str, str]]], template_embed: Embed=None, **kwargs) -> None:
        """ Create a paginated embed from a list. """
        super().__init__(ctx, **kwargs)
        self.embeds = []
        page_count = math.ceil(len(entries) / 24)

        if template_embed is None:
            template_embed = Embed()
        if template_embed.title == "":
            template_embed.title = "Entries"

        for i in range(page_count):
            embed = template_embed.copy()
            embed.title += f" (Page {i + 1}/{page_count})"

            next_endpoint = min(len(entries), (i + 1) * 24)
            for entry in entries[i * 24 : next_endpoint]:
                if type(entry) is Tuple:
                    name, value = entry
                else:
                    name, value = "​", entry  # Cheeky zero width space
                embed.add_field(
                    name=name,
                    value=value
                )

            self.embeds.append(embed)
        
        self.add_reaction("⏪", "back")
        self.add_reaction("⏹", "delete")
        self.add_reaction("⏩", "next")


    async def run(self, *args) -> None:
        await super().run(self.embeds, *args)
