class FriendlyError(Exception):
    """ An error we can show directly to the user. """
    def __init__(self, *args: object):
        # Add "Friendly Error: " to the beginning of the error text
        if isinstance(args[0], str):
            args = ("Friendly Error: " + args[0], *args[1:])
        super().__init__(*args)


class NotRegisteredError(FriendlyError):
    """ Parrot tried to access data from an unregistered user. """


class NoDataError(FriendlyError):
    """ Parrot tried to access an empty or nonexistent corpus. """


class UserNotFoundError(FriendlyError):
    """ Parrot tried to get a Discord user who does not exist. """


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
