class FriendlyError(Exception):
    """ An error we can show directly to the user. """
    def __init__(self, *args: object) -> None:
        if type(args[0]) is str:
            args[0] = "Friendly Error: " + args[0]
        super().__init__(*args)


class NotRegisteredError(FriendlyError):
    """ Parrot attempted to access data from an unregistered user. """
    pass


class NoDataError(FriendlyError):
    """ Parrot attempted to access an empty or nonexistent corpus. """
    pass
