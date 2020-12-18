from typing import Dict, Callable, List
from discord import ChannelType, Embed, Message, TextChannel

import asyncio
from discord.ext import commands
from utils.parrot_embed import ParrotEmbed
from utils.channel_crawler import ChannelCrawler
from utils.exceptions import AlreadyScanning


class Quickstart(commands.Cog):
    def __init__(self) -> None:
        # Keep track of Quickstart scans that are currently happening.
        # Key: Channel ID
        # Value: List of User IDs, representing whom Quickstart is scanning for
        #        in this channel.
        self.ongoing_scans: Dict[int, List[int]] = {}


    async def live_update_status(self, source_channel: TextChannel, status_message: Message, crawler: ChannelCrawler) -> None:
        while crawler.running:
            embed = ParrotEmbed(
                description=f"**Scanning {source_channel.mention}...**\nCollected {crawler.num_collected} new messages...",
            )
            embed.set_author(
                name="Quickstart",
                icon_url="https://i.gifer.com/ZZ5H.gif",  # Loading spinner
            )
            await status_message.edit(embed=embed)
            await asyncio.sleep(2)


    @commands.command()
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def quickstart(self, ctx: commands.Context) -> None:
        """ Scan your past messages to get started using Parrot right away. """
        if ctx.channel.id not in self.ongoing_scans:
            self.ongoing_scans[ctx.channel.id] = []

        # You can't run Quickstart in a channel that Quickstart is already
        #   currently scanning for you.
        if ctx.author.id in self.ongoing_scans[ctx.channel.id]:
            raise AlreadyScanning("❌ You are already currently running Quickstart in this channel!")

        # Record that Quickstart is scanning this channel for this user.
        self.ongoing_scans[ctx.channel.id].append(ctx.author.id)

        # Tell the user off if they try to run this command in a DM channel.
        if ctx.channel.type != ChannelType.text:
            await ctx.send(f"Quickstart is only available in servers. Try running \`{ctx.bot.command_prefix}quickstart\` again in a server that Parrot is in.")
            return

        # Show the user where they can use Quickstart within this server if they
        #   use the command in a channel where Parrot can't learn.
        if ctx.channel.id not in ctx.bot.learning_channels:
            embed = ParrotEmbed(
                title="Quickstart Channels",
                description=f"Quickstart is available in channels where Parrot can learn from your messages. Try running \`{ctx.bot.command_prefix}quickstart\` again in one of these channels:",
            )
            for channel in ctx.guild:
                if channel.id in ctx.bot.learning_channels:
                    embed.add_field(
                        name="​",
                        value=channel.mention,
                    )
            await ctx.send(embed=embed)
            return

        corpus = ctx.bot.corpora.get(ctx.author, {})
    
        # Create and embed that will show the status of the Quickstart
        #   operation and DM it to the user who invoked the command.
        embed = ParrotEmbed(
            description=f"**Scanning {ctx.channel.mention}...**\nCollected 0 new messages...",
        )
        embed.set_author(
            name="Quickstart",
            icon_url="https://i.gifer.com/ZZ5H.gif",  # Loading spinner
        )
        status_message = await ctx.author.send(embed=embed)
        await ctx.send(embed=ParrotEmbed(
            title="Quickstart is scanning",
            author=ctx.author,
            description="Parrot is now scanning this channel and learning from your past messages.\nThis could take a few minutes.\nCheck your DMs to see its progress."
        ))

        # Create an iterator representing this channel's past messages.
        def message_filter(message: Message) -> bool:
            return message.author == ctx.author
        history = ctx.channel.history(
            limit=10_000,
            after=ctx.author.joined_at,
        ).filter(message_filter)

        # Create an object that will scan through the channel's message history
        #   and learn from the messages this user has posted.
        crawler = ChannelCrawler(
            history=history,
            action=ctx.bot.learn_from,
        )

        # Start the crawler and periodically update the status_message with its
        #   progress.
        # Fun fact: these HAVE to be asyncio.gathered together. If they aren't,
        #   either the updater function won't be able to run until after the
        #   crawler has stopped, or the command will hang forever as the updater
        #   loops into eternity as it waits for the crawler (which isn't
        #   running) to tell it to stop.
        await asyncio.gather(
            crawler.crawl(),
            self.live_update_status(ctx.channel, status_message, crawler),
            loop=ctx.bot.loop,    
        )

        # Update the status embed one last time, but DELETE it this time and
        #   post a brand new one so that the user gets a new notification.
        embed = ParrotEmbed(
            description=f"**Scan in {ctx.channel.mention} complete.**\nCollected {crawler.num_collected} new messages.",
        )
        embed.set_author(name="✅ Quickstart")
        if crawler.num_collected == 0:
            embed.description = "😕 Couldn't find any messages from you in this channel.\n" + embed.description
            embed.color = ParrotEmbed.colors["red"]
        await asyncio.gather(
            status_message.delete(),
            ctx.author.send(embed=embed)
        )

        self.ongoing_scans[ctx.channel.id].remove(ctx.author.id)
        if len(self.ongoing_scans[ctx.channel.id]) == 0:
            del self.ongoing_scans[ctx.channel.id]


def setup(bot: commands.Bot) -> None:
    bot.add_cog(Quickstart())
