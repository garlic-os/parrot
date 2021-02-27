from typing import Iterable, Iterator, Set, TypeVar
import ujson as json  # ujson is faster
import os

T = TypeVar("T")


class DiskSet(Set[T]):
    """ A Set that mirrors its state to a file. """

    def __init__(self, path: str, iterable: Iterable[T]=()):
        self.data = set(iterable)
        self.path = path

        directories = os.path.split(self.path)[0]
        os.makedirs(directories, exist_ok=True)

        self.load()
        self.reload = self.load

    def __contains__(self, value: object) -> bool:
        return value in self.data

    def __iter__(self) -> Iterator[T]:
        return iter(self.data)

    def __len__(self) -> int:
        return len(self.data)

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
        except ValueError:
            print(f"File {self.path} is not valid JSON. It will be overwritten.")
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

    def discard(self, element: T) -> None:
        self.data.discard(element)
        self.save()

    def clear(self) -> None:
        self.data.clear()
        self.save()
