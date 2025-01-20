"""add memberguildlink on delete rules

Revision ID: a8ec7d2a4935
Revises: b48f3738cbc2
Create Date: 2025-01-20 05:10:57.765651

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a8ec7d2a4935"
down_revision: str | None = "b48f3738cbc2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	with op.batch_alter_table("memberguildlink") as batch_op:
		batch_op.drop_constraint(
			op.f("fk_memberguildlink_member_id_member"), type_="foreignkey"
		)
		batch_op.create_foreign_key(
			None, "member", ["member_id"], ["id"], ondelete="CASCADE"
		)
	with op.batch_alter_table("message") as batch_op:
		batch_op.drop_constraint(
			op.f("fk_message_author_id_member"), type_="foreignkey"
		)
		batch_op.create_foreign_key(
			None, "member", ["author_id"], ["id"], ondelete="CASCADE"
		)
	with op.batch_alter_table("avatarinfo") as batch_op:
		batch_op.drop_constraint(
			op.f("fk_avatarinfo_member_id_member"), type_="foreignkey"
		)
		batch_op.create_foreign_key(
			None, "member", ["member_id"], ["id"], ondelete="CASCADE"
		)


def downgrade() -> None:
	with op.batch_alter_table("memberguildlink") as batch_op:
		batch_op.drop_constraint(
			op.f("fk_memberguildlink_member_id_member"), type_="foreignkey"
		)
		batch_op.create_foreign_key(
			None, "member", ["member_id"], ["id"], ondelete=None
		)
	with op.batch_alter_table("message") as batch_op:
		batch_op.drop_constraint(
			op.f("fk_message_author_id_member"), type_="foreignkey"
		)
		batch_op.create_foreign_key(
			None, "member", ["author_id"], ["id"], ondelete=None
		)
	with op.batch_alter_table("avatarinfo") as batch_op:
		batch_op.drop_constraint(
			op.f("fk_avatarinfo_member_id_member"), type_="foreignkey"
		)
		batch_op.create_foreign_key(
			None, "member", ["member_id"], ["id"], ondelete=None
		)
