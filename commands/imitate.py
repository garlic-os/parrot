from discord import AllowedMentions, Permissions
from discord.ext import commands
from utils.pembed import Pembed
from utils.converters import Userlike
import requests


class ImitateCommand(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.command(brief="Imitate someone.")
    @commands.cooldown(2, 8, commands.BucketType.user)
    async def imitate(self, ctx: commands.Context, user: Userlike) -> None:
        """ Imitate a registered user. """
        # Fetch this user's chain.
        # May throw a NotRegistered or NoData error, which we'll just let the
        #   error handler deal with.
        chain = self.bot.chains[user]
        sentence = chain.make_short_sentence(500) or "Error"

        print("[*] Got this far")

        # Prepare to send this sentence through a webhook.
        # Discord lets you change the name and avatar of a webhook much faster
        #   than a user, which is crucial imitating lots of users quickly.
        webhook = self.bot.webhooks.get(ctx.channel.id, None)
        if webhook is None:
            # If no webhook is available for this channel, create it if Parrot
            #   has the right permissions.
            # TODO: Move this logic to WebhookManager
            if Permissions.manage_webhooks in ctx.channel.permissions_for(self.bot.user):
                avatar_bytes = requests.get(self.bot.user.avatar_url).content
                webhook = await ctx.channel.create_webhook(
                    name=f"Parrot in #{ctx.channel.name}",
                    avatar=avatar_bytes,
                )
                self.bot.webhooks[ctx.channel.id] = webhook
            # Otherwise, use an embed instead.
            else:
                embed = Pembed(
                    author=user,
                    description=sentence,
                )
                await ctx.send(embed=embed)
                return

        # Send the sentence through the webhook.
        await webhook.send(
            content=sentence,
            username=f"Not {user.nick}",
            avatar_url=user.avatar_url,
            allowed_mentions=AllowedMentions.none(),
        )
        return


def setup(bot: commands.Bot) -> None:
    bot.add_cog(ImitateCommand(bot))
