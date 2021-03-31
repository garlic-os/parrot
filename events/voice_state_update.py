from typing import cast

from discord import Member, VoiceState, VoiceChannel
from discord.ext import commands


class VoiceStateUpdateHandler(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: Member, before: VoiceState, after: VoiceState) -> None:
        guild = member.guild
        voice_channel = cast(VoiceChannel, after.channel)

        # Disconnect if alone
        if len(voice_channel.members) == 1 and guild.voice_client is not None:
            # named argument "force" for "disconnect" defaults to False
            await guild.voice_client.disconnect()  # type: ignore


def setup(bot: commands.Bot) -> None:
    bot.add_cog(VoiceStateUpdateHandler(bot))
