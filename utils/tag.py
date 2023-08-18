from discord import User


def tag(user: User) -> str:
    if user.discriminator != "0":
        return f"@{user.name}#{user.discriminator}"
    if user.global_name is None:
        return f"@{user.name}"
    return f"@{user.global_name}"
