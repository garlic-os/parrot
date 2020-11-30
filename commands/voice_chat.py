from discord.ext import commands
from utils.pembed import Pembed


class VoiceChatCommands(commands.Cog):
    """ Commands for managing the bot for voice channels. """

    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def join(self, ctx):
        """ Make Parrot join the voice channel that you are in. """
        if ctx.author.voice:
            voice_channel = ctx.author.voice.channel
            await voice_channel.connect()
        else:
            embed = Pembed(
                title="Error",
                description="You must be in a voice channel to use this command.",
                color_name="orange",
            )
            await ctx.send(embed=embed)

    @commands.command()
    async def leave(self, ctx):
        """ Make Parrot leave the voice channel that you are in. """
        player_in_guild = None
        for player in self.bot.voice_clients:
            if player.guild == ctx.guild:
                player_in_guild = player
                break

        if player_in_guild is None:
            embed = Pembed(
                title="Error",
                description="Not in a voice channel right now!",
                color_name="orange",
            )
            await ctx.send(embed=embed)
        else:
            await player_in_guild.disconnect()


def setup(bot):
    bot.add_cog(VoiceChatCommands(bot))
