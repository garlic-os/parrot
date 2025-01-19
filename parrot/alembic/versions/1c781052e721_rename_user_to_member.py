"""rename user to member

Revision ID: 1c781052e721
Revises: fd7c085ab081
Create Date: 2025-01-17 17:17:47.165851

"""

import logging
from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "1c781052e721"
down_revision: str | None = "fd7c085ab081"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	# Rename table User to Member
	op.rename_table("user", "member")

	# Rename Message.user_id to Message.member.id
	# Change foreign key constraint to Member.id
	try:
		with op.batch_alter_table("message") as batch_op:
			batch_op.drop_constraint(
				"fk_Message_user_id_User", type_="foreignkey"
			)
	except ValueError as e:
		# fk_Message_user_id_User is supposed to be there but it's not???
		logging.warning(e)
	with op.batch_alter_table("message") as batch_op:
		batch_op.alter_column("user_id", new_column_name="member_id")
		batch_op.create_foreign_key(
			"fk_Message_member_id_Member", "member", ["member_id"], ["id"]
		)


def downgrade() -> None:
	with op.batch_alter_table("message") as batch_op:
		batch_op.drop_constraint(
			"fk_Message_member_id_Member", type_="foreignkey"
		)
		batch_op.alter_column("member_id", new_column_name="user_id")
	op.rename_table("member", "user")
