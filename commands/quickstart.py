from discord import Member, Message, User
from bot import Parrot

import asyncio
import discord
from discord.ext import commands
from utils import HistoryCrawler, ParrotEmbed
from utils.exceptions import AlreadyScanning, NotRegisteredError, UserPermissionError
from utils.checks import is_admin
from utils.converters import Userlike


class Quickstart(commands.Cog):
    def __init__(self, bot: Parrot):
        self.bot = bot
        # Keep track of Quickstart scans that are currently happening.
        # Contains user IDs
        self.ongoing_scans: set[int] = set()


    async def live_update_status(
        self,
        status_message: Message,
        user: User,
        crawler: HistoryCrawler
    ) -> None:
        while crawler.running:
            embed = ParrotEmbed(
                description=(
                    f"**Scanning across Parrot's servers...**\nCollected "
                    f"{crawler.num_collected} new messages..."
                )
            )
            embed.set_author(
                name="Quickstart",
                icon_url="https://i.gifer.com/ZZ5H.gif",  # Loading spinner
            )
            embed.set_footer(
                text=f"Scanning for {user}",
                icon_url=user.display_avatar.url,
            )
            await status_message.edit(embed=embed)
            await asyncio.sleep(2)


    @commands.command()
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def quickstart(
        self,
        ctx: commands.Context,
        user: Userlike | None=None
    ) -> None:
        """ Scan your past messages to get started using Parrot right away. """
        if user is None or ctx.author == user:
            user = ctx.author
        else:
            if not is_admin(ctx):
                raise UserPermissionError(
                    "You can only run Quickstart on yourself."
                )
            if not user.bot:
                raise UserPermissionError(
                    "Quickstart can only be run on behalf of bots."
                )

        self.assert_registered(user)

        # You can only run one Quickstart scan at a time.
        if user.id in self.ongoing_scans:
            if ctx.author == user:
                raise AlreadyScanning("❌ Quickstart is already running!")
            raise AlreadyScanning(
                f"❌ Quickstart is already running for {user.mention}!"
            )

        self.ongoing_scans.add(user.id)

        # Clear the user's scan status if anything goes wrong (and this area has
        # a long history of things going wrong)
        try:
            # Create and embed that will show the status of the Quickstart
            # operation and DM it to the user who invoked the command.
            if ctx.author == user:
                name = "your"
            else:
                name = f"{user.mention}'s"
            embed = ParrotEmbed(
                description=(
                    "**Scanning across Parrot's servers...**\n"
                    "Collected 0 new messages..."
                )
            )
            embed.set_author(
                name="Quickstart",
                icon_url="https://i.gifer.com/ZZ5H.gif",  # Loading spinner
            )
            embed.set_footer(
                text=f"Scanning for {user.mention}",
                icon_url=user.display_avatar.url,
            )
            status_message = await ctx.author.send(embed=embed)
            await ctx.send(embed=ParrotEmbed(
                title="Quickstart is scanning",
                description=(
                    "Parrot is now scanning this server and learning from "
                    f"{name} past messages.\nThis could take a few minutes."
                    "\nCheck your DMs to see its progress."
                )
            ), reference=ctx.message)

            # Create an iterator representing up to 100,000 messages since the user
            # joined the server.
            histories = []
            for channel_id in self.bot.learning_channels:
                channel = await self.bot.fetch_channel(channel_id)
                member: Member = None
                try:
                    member = await channel.guild.fetch_member(user.id)
                except discord.errors.NotFound:
                    continue
                histories.append(
                    channel.history(
                        limit=100_000,
                        after=member.joined_at,
                    )
                )

            # Create an object that will scan through the server's message history
            # and learn from the messages this user has posted.
            crawler = HistoryCrawler(
                histories=histories,
                action=self.bot.learn_from,
                filter=lambda message: message.author == user,
                limit=100_000,
            )

            # In parallel, start the crawler and periodically update the
            # status_message with its progress.
            await asyncio.gather(
                self.live_update_status(
                    status_message=status_message,
                    user=user,
                    crawler=crawler,
                ),
                crawler.crawl(),
            )

            # Update the status embed one last time, but DELETE it this time and
            #   post a brand new one so that the user gets a new notification.
            name = "you" if ctx.author == user else f"{user.mention}"
            embed = ParrotEmbed(
                description=(
                    f"**Scan complete.**\nCollected "
                    f"{crawler.num_collected} new messages."
                )
            )
            embed.set_author(name="✅ Quickstart")
            embed.set_footer(
                text=f"Scanning for {user.mention}",
                icon_url=user.display_avatar.url,
            )
            if crawler.num_collected == 0:
                embed.description += (
                    f"\n😕 Couldn't find any messages from {name}."
                )
                embed.color = ParrotEmbed.colors["red"]
            await asyncio.gather(
                status_message.delete(),
                ctx.author.send(embed=embed)
            )
        except:  # noqa - we really do need to just catch ANY error
            self.ongoing_scans.remove(user.id)
            raise

        self.ongoing_scans.remove(user.id)


    def assert_registered(self, user: User | Member) -> None:
        if not user.bot and user.id not in self.bot.registered_users:
            raise NotRegisteredError(
                f"User {user.mention} is not opted in to Parrot. To opt in, do "
                f"the `{self.bot.command_prefix}register` command."
            )


async def setup(bot: Parrot) -> None:
    await bot.add_cog(Quickstart(bot))
