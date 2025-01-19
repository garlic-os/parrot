"""the rest of the owl

Revision ID: 6759a5369727
Revises: 1c781052e721
Create Date: 2025-01-18 14:23:31.240320

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "6759a5369727"
down_revision: str | None = "1c781052e721"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.create_table(
		"avatarinfo",
		sa.Column(
			"original_avatar_url",
			sa.String(),
			nullable=False,
		),
		sa.Column("antiavatar_url", sa.String(), nullable=False),
		sa.Column("antiavatar_message_id", sa.Integer(), nullable=False),
		sa.Column("member_id", sa.Integer(), nullable=False),
		sa.Column("guild_id", sa.Integer(), nullable=False),
		sa.ForeignKeyConstraint(
			["guild_id"],
			["guild.id"],
		),
		sa.ForeignKeyConstraint(
			["member_id"],
			["member.id"],
		),
		sa.PrimaryKeyConstraint("member_id", "guild_id"),
	)
	op.create_table(
		"memberguildlink",
		sa.Column("member_id", sa.Integer(), nullable=False),
		sa.Column("guild_id", sa.Integer(), nullable=False),
		sa.Column("is_registered", sa.Boolean(), nullable=False),
		sa.ForeignKeyConstraint(
			["guild_id"],
			["guild.id"],
		),
		sa.ForeignKeyConstraint(
			["member_id"],
			["member.id"],
		),
		sa.PrimaryKeyConstraint("member_id", "guild_id"),
	)
	op.add_column(
		"channel", sa.Column("guild_id", sa.Integer(), nullable=False)
	)
	with op.batch_alter_table("channel") as batch_op:
		batch_op.create_foreign_key(None, "guild", ["guild_id"], ["id"])
	op.add_column(
		"member",
		sa.Column("wants_random_devolve", sa.Boolean(), nullable=False),
	)
	op.drop_column("member", "modified_avatar_url")
	op.drop_column("member", "is_registered")
	op.drop_column("member", "modified_avatar_message_id")
	op.drop_column("member", "original_avatar_url")
	op.add_column(
		"message", sa.Column("author_id", sa.Integer(), nullable=False)
	)
	op.add_column(
		"message", sa.Column("guild_id", sa.Integer(), nullable=False)
	)
	with op.batch_alter_table("message") as batch_op:
		batch_op.drop_constraint(
			"fk_messages_user_id_users", type_="foreignkey"
		)
		batch_op.create_foreign_key(None, "member", ["author_id"], ["id"])
		batch_op.create_foreign_key(None, "guild", ["guild_id"], ["id"])
	op.drop_column("message", "member_id")


def downgrade() -> None:
	op.add_column(
		"message", sa.Column("member_id", sa.Integer(), nullable=False)
	)
	with op.batch_alter_table("message") as batch_op:
		batch_op.drop_constraint(None, type_="foreignkey")
		batch_op.drop_constraint(None, type_="foreignkey")
		batch_op.create_foreign_key(
			"fk_messages_user_id_users", "member", ["member_id"], ["id"]
		)
		batch_op.drop_column("guild_id")
		batch_op.drop_column("author_id")
	op.add_column(
		"member", sa.Column("original_avatar_url", sa.String(), nullable=True)
	)
	op.add_column(
		"member",
		sa.Column("modified_avatar_message_id", sa.Integer(), nullable=True),
	)
	op.add_column(
		"member",
		sa.Column(
			"is_registered",
			sa.Boolean(),
			server_default=sa.text("'0'"),
			nullable=False,
		),
	)
	op.add_column(
		"member", sa.Column("modified_avatar_url", sa.String(), nullable=True)
	)
	op.drop_column("member", "wants_random_devolve")
	with op.batch_alter_table("channel") as batch_op:
		batch_op.drop_constraint(None, type_="foreignkey")
	op.drop_column("channel", "guild_id")
	op.drop_table("memberguildlink")
	op.drop_table("avatarinfo")
