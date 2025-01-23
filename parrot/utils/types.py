from typing import Literal

import discord


type AnyUser = discord.User | discord.Member | discord.ClientUser

# Something an admin has decided Parrot can or can't do in a channel.
# Not Discord permissions, but new permissions Parrot handles herself.
type Permission = Literal["can_learn_here"] | Literal["can_speak_here"]

# Type alias for Discord's favored Twitter Snowflake ints.
# Helps differentiate ints used as Snowflakes from ints used as anything else.
Snowflake = int  # can't call it a type though or sqlmodel gets mad
