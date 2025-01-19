"""rename tables for sqlmodel

Revision ID: 21069c329505
Revises: fe3138aef0bd
Create Date: 2025-01-14 22:50:32.078877

"""

from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "21069c329505"
down_revision: str | None = "fe3138aef0bd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.rename_table("users", "user")
	op.rename_table("channels", "channel")
	op.rename_table("messages", "message")
	op.rename_table("guilds", "guild")


def downgrade() -> None:
	op.rename_table("guild", "guilds")
	op.rename_table("message", "messages")
	op.rename_table("channel", "channels")
	op.rename_table("user", "users")
