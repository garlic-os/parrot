from typing import TypeVar, cast

from parrot.core.types import AnyUser


T = TypeVar("T")
def cast_not_none(arg: T | None) -> T:
	return cast(T, arg)


def tag(user: AnyUser) -> str:
	if user.discriminator != "0":
		return f"@{user.name}#{user.discriminator}"
	return f"@{user.name}"
