from typing import Iterable, Set, TypeVar
import ujson as json  # ujson is faster

T = TypeVar("T")


class DiskSet(Set[T]):
    """
    A Set that mirrors its state to a file.
    TODO: Every other method
    """

    def __init__(self, path: str, iterable: Iterable[T] = ()) -> None:
        self.data = set(iterable)
        self.path = path
        self.load()
        self.reload = self.load

    def __contains__(self, value: object) -> bool:
        """ Redirect contains calls to the inner data set. """
        return value in self.data

    def load(self) -> None:
        try:
            with open(self.path, "r") as f:
                data = json.load(f)
            if type(data) is list:
                self.data.update(data)
            else:
                raise TypeError(f'Provided file "{self.path}" is valid JSON, but is not the right type. The data must resolve to a list.')
        except FileNotFoundError:
            print(f"File {self.path} not found. A new file will be created in its place.")
            self.save()

    def save(self) -> None:
        with open(self.path, "w") as f:
            f.write(str(list(self.data)))

    def add(self, element: T) -> None:
        self.data.add(element)
        self.save()

    def remove(self, element: T) -> None:
        self.data.remove(element)
        self.save()
