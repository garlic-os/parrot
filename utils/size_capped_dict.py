from collections import OrderedDict
from typing import TypeVar

K = TypeVar("K")
V = TypeVar("V")


class SizeCappedDict(OrderedDict):  # OrderedDict[K, V]
    """
    An ordered dict with a maximum size.
    Deletes its oldest entry when about to go over capacity.
    """

    def __init__(self, max_size: int, *args) -> None:
        super().__init__(*args)
        assert max_size > 0, "Maximum dictionary size must be positive"
        self.max_size = max_size

    def __setitem__(self, key: K, value: V) -> None:
        # If the dict is at maximum capacity, delete its oldest entry before
        #   adding the new one.
        if super().__len__() == self.max_size:
            oldest_key = list(super().__iter__())[0]
            super().__delitem__(oldest_key)
        super().__setitem__(key, value)
