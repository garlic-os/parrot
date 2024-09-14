from discord import Member, User


def tag(user: User | Member) -> str:
    if user.discriminator != "0":
        return f"@{user.name}#{user.discriminator}"
    return f"@{user.name}"
