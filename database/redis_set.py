from typing import Iterator, Set, Union
from redis import Redis

# The valid Redis value types
RedisSetValue = Union[bytes, str, int, float]


class RedisSet:
    """ A proxy to a set in a Redis database. """
    def __init__(self, redis: Redis, key: str):
        self.redis = redis
        self.key = key

    def __contains__(self, value: object) -> bool:
        return self.redis.sismember(self.key, value)

    def __iter__(self) -> Iterator[RedisSetValue]:
        return iter(self.data)

    def __len__(self) -> int:
        return self.redis.scard(self.key)

    def add(self, element: RedisSetValue) -> None:
        self.redis.sadd(self.key, element)

    def remove(self, element: RedisSetValue) -> None:
        self.redis.srem(self.key, element)

    def clear(self) -> None:
        self.redis.delete(self.key)

    @property
    def data(self) -> Set[RedisSetValue]:
        return self.redis.smembers(self.key)
