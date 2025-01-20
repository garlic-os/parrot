from typing import Literal

from discord import ClientUser, Member, User


Snowflake = int  # can't call it a type or sqlmodel gets mad
type AnyUser = User | Member | ClientUser

# Something an admin has decided Parrot can or can't do in a channel.
# Not Discord permissions, but new permissions Parrot handles herself.
type Permission = Literal["can_learn_here"] | Literal["can_speak_here"]
