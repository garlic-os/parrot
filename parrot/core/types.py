from typing import Literal

from discord import ClientUser, Member, User
from parrot.bot import AbstractParrot


Snowflake = int
type AnyUser = User | Member | ClientUser

# Something an admin has decided Parrot can or can't do in a channel.
# Not Discord permissions, but new permissions Parrot handles herself.
type Permission = Literal["can_learn_here"] | Literal["can_speak_here"]


class SubCRUD:
	bot: AbstractParrot

	def __init__(self, bot: AbstractParrot):
		self.bot = bot
