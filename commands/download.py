import requests
from discord.ext import commands
from utils.pembed import Pembed
from utils.exceptions import NoDataError


class DownloadCommand(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.command(aliases=["checkout"])
    @commands.cooldown(2, 3600, commands.BucketType.user)
    async def download(self, ctx: commands.Context) -> None:
        """ Download a copy of your data. """
        user = ctx.author

        try:
            corpus_file_path = self.bot.corpora.file_path(user)
        except FileNotFoundError:
            raise NoDataError(f"No data available for user {user.name}#{user.discriminator}")

        # Upload to anonfiles because it has a free upload API lmao
        # TODO: Do anything but this
        with open(corpus_file_path, "rb") as f:
            response = requests.post(
                "https://api.anonymousfiles.io/",
                files={"file": f},
                json={"expires": "6h", "no_index": "true"},
                verify=False,
            ).json()

        # DM the user their download link.
        embed_download_link = Pembed(
            title="Link to download your data",
            description=response["url"],
        )
        embed_download_link.set_footer(text="Link expires in 6 hours.")
        await user.send(embed=embed_download_link)

        # Tell them to check their DMs.
        embed_download_ready = Pembed(
            title="Download ready",
            color_name="green",
            description="A link to download your data has been DM'd to you.",
        )
        await ctx.send(embed=embed_download_ready)


def setup(bot: commands.Bot) -> None:
    bot.add_cog(DownloadCommand(bot))
