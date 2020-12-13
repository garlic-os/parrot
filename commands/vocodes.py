from discord import ClientException

import discord
from discord.ext import commands
import aiohttp
import math
import ujson as json  # ujson is faster
from typing import Optional
from tempfile import TemporaryFile
from utils import Paginator
from utils.pembed import Pembed


def get_speaker(name: str) -> Optional[dict]:
    """
    Get a speaker's data entry from any of many names.
    You can use their formal name, their slug, or one of any provided aliases.
    All the names associated with a speaker can be found in speaker.json.
    """
    name = name.lower()
    for speaker in speakers:
        aliases = speaker.get("aliases", [])
        for i, alias in enumerate(aliases):
            aliases[i] = alias.lower()
        names = [speaker["name"].lower(), speaker["slug"]] + aliases
        if name in names:
            return speaker
    return None


def in_voice_channel(ctx: commands.Context) -> bool:
    """ Check if the bot is in the context's voice channel.  """
    return ctx.bot.user.id in ctx.author.voice.channel.voice_states


# Load the speakers database and an array of their names.
with open("data/speakers.json") as f:
    speakers = json.load(f)
    speaker_names = []
    for speaker in speakers:
        speaker_names.append(speaker["name"])
    speaker_names.sort(
        key=lambda text: text.lower()
    )


class VocodesCommands(commands.Cog):
    """ Make pop culture icons say whatever you want! Powered by vo.codes. """

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.command()
    async def leave(self, ctx: commands.Context) -> None:
        """ Make Parrot leave the voice channel that you are in. """
        if ctx.author.voice is not None:
            voice_client = ctx.author.voice.channel.voice_states.get(ctx.bot.user.id, None)
            if voice_client is not None:
                await voice_client.disconnect()
                return

        await ctx.send(embed=Pembed(
            title="Error",
            description="You must be in a voice channel with Parrot to use this command.",
            color_name="orange",
        ))


    @commands.command(aliases=["ditto"], usage=f"speaker name; message to speak")
    async def vocodes(self, ctx: commands.Context, *, args: str) -> None:
        """ Make pop culture icons say whatever you want! """

        # Join the voice channel the context's author is in.
        if ctx.author.voice is None:
            await ctx.send(embed=Pembed(
                title="Error",
                description="You must be in a voice channel to use this command.",
                color_name="orange",
            ))
            return
        else:
            try:
                voice_client = await ctx.author.voice.channel.connect()
            except ClientException:
                pass

        """
        Command parsing code copied from crimsoBOT.
        Copyright (c) 2019 crimso, williammck; MIT License.
        """
        user_input = args.split(";", 1)
        speaker_name = user_input.pop(0).strip().lower()

        # Parse command input into a speaker name and body of text,
        #   separated by a semicolon.
        try:
            text = user_input[0].strip()
        except IndexError:
            embed = Pembed(
                title="Syntax error",
                description=f"You didn't do that correctly! Try this:\n`{self.bot.command_prefix}vocodes speaker name; your text`",
                color_name="orange",
            )
            await ctx.send(embed=embed)
            return

        # Verify proper length. Must be at least 1 character and at most 1000.
        if not (1 <= len(text) <= 1000):
            embed = Pembed(
                title="Text too long",
                description="Text must be at least 1 character and at most 1000 characters long.",
                color_name="orange",
            )
            await ctx.send(embed=embed)
            return

        speaker = get_speaker(speaker_name)

        if speaker is None:
            embed = Pembed(title="Invalid speaker name", color_name="orange")
            await ctx.send(embed=embed)
            return

        payload = {
            "speaker": speaker["slug"],
            "text": text,
        }

        if speaker['avatarUrl'].startswith("https"):
            avatar_url = speaker['avatarUrl']
        else:
            avatar_url = f"https://vo.codes/avatars/{speaker['avatarUrl']}"

        loading_embed = Pembed(
            title="Generating sentence...",
            description=f"_{speaker['description']}_",
        )
        loading_embed.set_author(
            name=speaker["name"],
            icon_url="https://i.gifer.com/ZZ5H.gif",  # Loading spinner
        )
        loading_embed.set_footer(
            text=f"Voice model quality: {speaker['voiceQuality'] * 10}%"
        )
        loading_embed.set_thumbnail(url=avatar_url)

        # Send a loading message
        loading_message = await ctx.send(embed=loading_embed)

        # Send a request to vo.codes for a clip of the given character saying
        #   the given text. The server will respond back with a .wav file.
        #   (mumble.stream is vo.codes's backend server)
        async with aiohttp.ClientSession() as session:
            async with session.post("https://mumble.stream/speak", json=payload) as response:
                if response.status == 200:
                    # Once complete, edit the message to say "success" instead of "loading"
                    loading_embed.title = "Generated a sentence!"
                    loading_embed.set_author(name="✅ " + speaker["name"])
                    await loading_message.edit(embed=loading_embed)

                    # Transform the data into a file stream.
                    # Unfortunately, a BytesIO won't cut it here, because FFmpeg
                    #   requires that the stream implements the fileno() method,
                    #   and BytesIO does (can) not.
                    # So we have to be hacky and put it into a temporary file instead.
                    with TemporaryFile() as f:
                        # Write the audio data to a temporary file.
                        f.write(await response.content.read())

                        # Seek to the beginning to read it again.
                        f.seek(0)

                        # Stream the audio over voice chat.
                        voice_client.play(
                            # mypy is complaining about overloads here even
                            #   though this one definitely exists.
                            discord.FFmpegPCMAudio(  # type: ignore
                                f,
                                pipe=True,
                                options=["-ar 48000", "-ac 1"]
                            )
                        )
                else:
                    # Edit the loading embed to show there was an error.
                    loading_embed.title = "oh no"
                    loading_embed.set_author(name="❌ " + speaker["name"])
                    await loading_message.edit(embed=loading_embed)

                    # Post a new embed explaining the error.
                    embed = Pembed(
                        title="🤷‍♂️ Error",
                        description=f"Something went wrong while generating the speech:\n{response.status} {response.reason}",
                        color_name="red",
                        footer="Give it a moment and try again.",
                    )
                    await ctx.send(embed=embed)


    @commands.command(aliases=["speakers"])
    async def voices(self, ctx: commands.Context) -> None:
        """ List the speakers that Parrot can imitate through vo.codes. """
        speaker_count = len(speaker_names)
        embeds = []
        page_count = math.ceil(speaker_count / 24)

        for i in range(page_count):
            embed = Pembed(
                title=f"Speakers (Page {i + 1}/{page_count})", author=ctx.author
            )
            embed.set_footer(text="Powered by vo.codes: https://vo.codes/")

            next_endpoint = min(speaker_count, (i + 1) * 24)
            for name in speaker_names[i * 24 : next_endpoint]:
                embed.add_field(name="​", value=name)

            embeds.append(embed)

        paginator = Paginator.CustomEmbedPaginator(ctx)
        paginator.add_reaction("⏪", "back")
        paginator.add_reaction("⏹", "delete")
        paginator.add_reaction("⏩", "next")
        await paginator.run(embeds)


def setup(bot):
    bot.add_cog(VocodesCommands(bot))

