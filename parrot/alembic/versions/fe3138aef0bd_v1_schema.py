"""v1 schema

Revision ID: fe3138aef0bd
Revises:
Create Date: 2025-01-14 22:41:54.853953

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "fe3138aef0bd"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# https://github.com/garlic-os/parrot/blob/53a95b8/bot.py#L56-L82
def upgrade() -> None:
	op.create_table(
		"channels",
		sa.Column("id", sa.Integer(), nullable=False),
		sa.Column(
			"can_speak_here",
			sa.Boolean(),
			server_default=sa.text("'0'"),
			nullable=False,
		),
		sa.Column(
			"can_learn_here",
			sa.Boolean(),
			server_default=sa.text("'0'"),
			nullable=False,
		),
		sa.Column("webhook_id", sa.Integer(), nullable=True),
		sa.PrimaryKeyConstraint("id", name="pk_channels"),
	)
	op.create_table(
		"users",
		sa.Column("id", sa.Integer(), nullable=False),
		sa.Column(
			"is_registered",
			sa.Boolean(),
			server_default=sa.text("'0'"),
			nullable=False,
		),
		sa.Column("original_avatar_url", sa.String(), nullable=True),
		sa.Column("modified_avatar_url", sa.String(), nullable=True),
		sa.Column("modified_avatar_message_id", sa.Integer(), nullable=True),
		sa.PrimaryKeyConstraint("id", name="pk_users"),
	)
	op.create_table(
		"guilds",
		sa.Column("id", sa.Integer(), nullable=False),
		sa.Column(
			"imitation_prefix",
			sa.String(),
			server_default=sa.text("'Not '"),
			nullable=False,
		),
		sa.Column(
			"imitation_suffix",
			sa.String(),
			server_default=sa.text("('')"),
			nullable=False,
		),
		sa.PrimaryKeyConstraint("id", name="pk_guilds"),
	)
	op.create_table(
		"messages",
		sa.Column("id", sa.Integer(), nullable=False),
		sa.Column("user_id", sa.Integer(), nullable=False),
		sa.Column("timestamp", sa.Integer(), nullable=False),
		sa.Column("content", sa.String(), nullable=False),
		sa.ForeignKeyConstraint(
			["user_id"], ["users.id"], name="fk_messages_user_id_users"
		),
		sa.PrimaryKeyConstraint("id", name="pk_messages"),
	)


def downgrade() -> None:
	op.drop_table("guilds")
	op.drop_table("messages")
	op.drop_table("channels")
	op.drop_table("users")
