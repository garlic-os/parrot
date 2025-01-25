"""rename user to member

Revision ID: 1c781052e721
Revises: e94b76519be5
Create Date: 2025-01-17 17:17:47.165851

"""

from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "1c781052e721"
down_revision: str | None = "e94b76519be5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.rename_table("user", "member")

	# Rename message.user_id to message.author_id
	with op.batch_alter_table("message") as batch_op:
		batch_op.alter_column("user_id", new_column_name="author_id")


def downgrade() -> None:
	with op.batch_alter_table("message") as batch_op:
		batch_op.drop_constraint(
			op.f("fk_message_author_id_member"), type_="foreignkey"
		)
		batch_op.alter_column("author_id", new_column_name="user_id")
	op.rename_table("member", "user")
