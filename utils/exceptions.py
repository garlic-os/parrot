class FriendlyError(Exception):
    """ An error we can show directly to the user. """
    def __init__(self, *args: object) -> None:
        # Add "Friendly Error: " to the beginning of the error text
        if type(args[0]) is str:
            args = ("Friendly Error: " + args[0], *args[1:])
        super().__init__(*args)


class NotRegisteredError(FriendlyError):
    """ Parrot attempted to access data from an unregistered user. """
    pass


class NoDataError(FriendlyError):
    """ Parrot attempted to access an empty or nonexistent corpus. """
    pass
