from typing import List
from discord import ChannelType, Embed, Message

from discord.ext import commands
from utils.parrot_embed import ParrotEmbed
from utils.timeout import set_interval


class Quickstart(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot


    @staticmethod
    def create_status_embed(num_collected: int) -> Embed:
        embed = ParrotEmbed(title="Quickstart")
        embed.add_field(
            name="Scanning...",
            value=f"Collected {num_collected} messages...",
        )
        return embed


    async def update_status_message(self, status_message: Message, num_collected: int) -> None:
        embed = Quickstart.create_status_embed(num_collected)
        await status_message.edit(embed=embed)


    @commands.command()
    async def quickstart(self, ctx: commands.Context) -> None:
        """ Scan your past messages to get started using Parrot right away. """
        if ctx.channel.type != ChannelType.text:
            await ctx.send(f"Quickstart is only available in servers. Try running \`{self.bot.command_prefix}quickstart\` again in a server that Parrot is in.")
            return

        if ctx.channel.id not in self.bot.learning_channels:
            # Show the user where they can use Quickstart within this server
            #   if they use the command in a channel where Parrot can't learn.
            embed = ParrotEmbed(
                title="Quickstart Channels",
                description=f"Quickstart is available in channels where Parrot can learn from your messages. Try running \`{self.bot.command_prefix}quickstart\` again in one of these channels:",
            )
            for channel in ctx.guild:
                if channel.id in self.bot.learning_channels:
                    embed.add_field(
                        name="​",
                        value=f"<#{channel.id}>",
                    )
            await ctx.send(embed=embed)
            return

        corpus = self.bot.corpora.get(ctx.author, {})

        # You can only use Quickstart if your corpus is small enough.
        if len(corpus) > 100:
            embed = ParrotEmbed(
                title="You have too much data for Quickstart.",
                description="You are no longer eligible for Quickstart because Parrot has already recorded more than 100 of your messages.",
                color_name="red",
            )
            await ctx.send(embed=embed)
            return

        # Keep track of how many messages have been collected so Parrot can
        #   give this information to the user in realtime.
        total_collected = 0
    
        # Create and post an embed that will show the status of the Quickstart
        #   operation.
        embed = Quickstart.create_status_embed(total_collected)
        status_message = await ctx.send(embed=embed)

        # Update the status message every 2 seconds.
        update_loop = set_interval(
            status_message,
            total_collected,
            callback=self.update_status_message,
            interval=2000,
            loop=self.bot.loop,
        )

        # Iterate over the messages this user has sent in this channel in
        #   reverse-chronological order and collect up to 10,000 of them.
        messages: List[Message] = []
        async for message in ctx.channel.history(limit=10_000):
            if message.author != ctx.author:
                continue

            messages.append(message)

            # Learn from the messages in groups of 1000, flushing the list each
            #   time, to keep memory usage under control.
            if len(messages) > 999:
                total_collected += self.bot.learn_from(messages)
                messages.clear()

        # Stop the loop that automatically updates the status message.
        update_loop.cancel()

        # Update the status embed one last time.
        total_collected += self.bot.learn_from(messages)
        embed = Quickstart.create_status_embed(total_collected)

        # Add some extra "oh no" information if no messages were found.
        if total_collected == 0:
            embed.description = "😕 Couldn't find any messages from you in this channel."
            embed.color = ParrotEmbed.colors["red"]
        
        await status_message.edit(embed=embed)




def setup(bot: commands.Bot) -> None:
    bot.add_cog(Quickstart(bot))
