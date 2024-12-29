"""v1 schema

Revision ID: 14654391b9fb
Revises:
Create Date: 2024-12-20 15:45:58.933390

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "14654391b9fb"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# https://github.com/garlic-os/parrot/blob/53a95b8/bot.py#L56-L82
def upgrade() -> None:
	op.create_table(
		"users",
		sa.Column("id", sa.BigInteger, primary_key=True),
		sa.Column(
			"is_registered", sa.Boolean, nullable=False, server_default="0"
		),
		sa.Column("original_avatar_url", sa.Text),
		sa.Column("modified_avatar_url", sa.Text),
		sa.Column("modified_avatar_message_id", sa.BigInteger),
	)
	op.create_table(
		"channels",
		sa.Column("id", sa.BigInteger, primary_key=True),
		sa.Column(
			"can_speak_here", sa.Boolean, nullable=False, server_default="0"
		),
		sa.Column(
			"can_learn_here", sa.Boolean, nullable=False, server_default="0"
		),
		sa.Column("webhook_id", sa.BigInteger),
	)
	op.create_table(
		"messages",
		sa.Column("id", sa.BigInteger, primary_key=True),
		sa.Column(
			"user_id", sa.BigInteger, sa.ForeignKey("users.id"), nullable=False
		),
		sa.Column("timestamp", sa.BigInteger, nullable=False),
		sa.Column("content", sa.Text, nullable=False),
	)
	op.create_table(
		"guilds",
		sa.Column("id", sa.BigInteger, primary_key=True),
		sa.Column(
			"imitation_prefix", sa.Text, nullable=False, server_default="Not "
		),
		sa.Column(
			"imitation_suffix", sa.Text, nullable=False, server_default=""
		),
	)


def downgrade() -> None:
	op.drop_table("guilds")
	op.drop_table("messages")
	op.drop_table("channels")
	op.drop_table("users")
