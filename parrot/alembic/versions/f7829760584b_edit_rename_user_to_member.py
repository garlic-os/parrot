"""edit rename user to member

Revision ID: f7829760584b
Revises: 748c84de5dcb
Create Date: 2024-12-28 17:11:34.916558

"""

import logging
from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f7829760584b"
down_revision: str | None = "748c84de5dcb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	# Rename table User to Member
	op.rename_table("User", "Member")

	# Rename Message.user_id to Message.member.id
	# Change foreign key constraint to Member.id
	try:
		with op.batch_alter_table("Message") as batch_op:
			batch_op.drop_constraint("fk_Message_user_id_User", type_="foreignkey")
	except ValueError as e:
		# fk_Message_user_id_User is supposed to be there but it's not???
		logging.warning(e)
	with op.batch_alter_table("Message") as batch_op:
		batch_op.alter_column("user_id", new_column_name="member_id")
		batch_op.create_foreign_key(
			"fk_Message_member_id_Member", "member", ["member_id"], ["id"]
		)

	# Rename Registration.user_id to Registration.member_id
	# Change foreign key constraint to Member.id
	try:
		with op.batch_alter_table("Registration") as batch_op:
			batch_op.drop_constraint("fk_Registration_user_id_User", type_="foreignkey")
	except ValueError as e:
		logging.warning(e)
	with op.batch_alter_table("Registration") as batch_op:
		batch_op.alter_column("user_id", new_column_name="member_id")
		batch_op.create_foreign_key(
			"fk_Registration_member_id_Member", "member", ["member_id"], ["id"]
		)

def downgrade() -> None:
	with op.batch_alter_table("Message") as batch_op:
		batch_op.drop_constraint("fk_Message_member_id_Member", type_="foreignkey")
		batch_op.alter_column("member_id", new_column_name="user_id")
	with op.batch_alter_table("Registration") as batch_op:
		batch_op.drop_constraint("fk_Registration_member_id_Member", type_="foreignkey")
		batch_op.alter_column("member_id", new_column_name="user_id")
	op.rename_table("Member", "User")
