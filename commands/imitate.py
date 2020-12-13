from discord import AllowedMentions
from discord.ext import commands
from utils.pembed import Pembed
from utils.converters import Userlike
import requests


class ImitateCommand(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.command(brief="Imitate someone.")
    @commands.cooldown(2, 4, commands.BucketType.user)
    async def imitate(self, ctx: commands.Context, user: Userlike) -> None:
        """ Imitate a registered user. """
        # Fetch this user's chain.
        # May throw a NotRegistered or NoData error, which we'll just let the
        #   error handler deal with.
        chain = self.bot.chains[user]
        sentence = chain.make_short_sentence(500) or "Error"

        # Prepare to send this sentence through a webhook.
        # Discord lets you change the name and avatar of a webhook much faster
        #   than a user, which is crucial imitating lots of users quickly.
        webhook = self.bot.webhooks.get(ctx.channel.id, None)
        if webhook is None:
            # If no webhook is available for this channel, create one as long as
            #   Parrot has the right permissions.
            # TODO: Move this logic to WebhookManager
            if commands.bot_has_permissions(manage_webhooks=True):
                avatar_bytes = requests.get(self.bot.user.avatar_url).content
                webhook = await ctx.channel.create_webhook(
                    name=f"Parrot in #{ctx.channel.name}",
                    avatar=avatar_bytes,
                )
                self.bot.webhooks[ctx.channel.id] = webhook
            # Otherwise, just use an embed.
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
            username=f"Not {user.display_name}",
            avatar_url=user.avatar_url,
            allowed_mentions=AllowedMentions.none(),
        )
        return


def setup(bot: commands.Bot) -> None:
    bot.add_cog(ImitateCommand(bot))
