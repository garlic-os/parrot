from typing import Generic, TypeVar
from collections import OrderedDict

K = TypeVar("K")
V = TypeVar("V")


class LRUCache(Generic[K, V], OrderedDict):
    """
    Limit size, evicting the least recently looked-up key when full.
    https://docs.python.org/3/library/collections.html#collections.OrderedDict
    """

    def __init__(self, max_size: int, *args, **kwargs):
        assert max_size > 0, "Maximum dictionary size must be positive"
        super().__init__(*args, **kwargs)
        self.max_size = max_size

    def __getitem__(self, key: K) -> V:
        value = super().__getitem__(key)
        self.move_to_end(key)
        return value

    def __setitem__(self, key: K, value: V) -> None:
        if key in self:
            self.move_to_end(key)
        super().__setitem__(key, value)
        if len(self) > self.max_size:
            oldest = next(iter(self))
            del self[oldest]
