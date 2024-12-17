from parrot.core.types import AnyUser


def tag(user: AnyUser) -> str:
	if user.discriminator != "0":
		return f"@{user.name}#{user.discriminator}"
	return f"@{user.name}"
