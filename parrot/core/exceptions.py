from parrot.config import settings
from parrot.core.types import AnyUser


class FriendlyError(Exception):
	"""An error we can show directly to the user."""

	def __init__(self, *args: object):
		# Add "Friendly Error: " to the beginning of the error text
		if isinstance(args[0], str) and len(args) >= 2:
			args = ("Friendly Error: " + args[0], *args[1:])
		super().__init__(*args)


class NotRegisteredError(FriendlyError):
	"""Parrot tried to access data from an unregistered user."""

	def __init__(self, user: AnyUser):
		super().__init__(
			f"User {user.mention} is not opted in to Parrot in this server. "
			f"To opt in, do the `{settings.command_prefix}register` command."
		)


class NoDataError(FriendlyError):
	"""Parrot tried to access an empty or nonexistent corpus."""


class UserNotFoundError(FriendlyError):
	"""Parrot tried to get a Discord user who does not exist."""

	def __init__(self, text: str):
		super().__init__(f'User "{text}" does not exist.')


class FeatureDisabledError(FriendlyError):
	"""A user tried to use a feature that is disabled on this instance of Parrot."""


class UserPermissionError(FriendlyError):
	"""
	A user tried to commit an action with Parrot that they don't have the right
	permissions to do.
	"""


class AlreadyScanning(FriendlyError):
	"""
	A user tried to run Quickstart in a channel that Quickstart is already
	scanning for them.
	"""


class ChannelTypeError(FriendlyError):
	"""
	Requested command is not available in this type of channel.
	"""
