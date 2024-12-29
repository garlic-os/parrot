"""rename tables for sqlmodel

Revision ID: bf04f79d517c
Revises: fd7c085ab081
Create Date: 2024-12-20 19:49:36.812149

"""

from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "bf04f79d517c"
down_revision: str | None = "14654391b9fb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.rename_table("users", "User")
	op.rename_table("channels", "Channel")
	op.rename_table("messages", "Message")
	with op.batch_alter_table("Message") as batch_op:
		batch_op.drop_constraint("fk_messages_user_id_users", type_="foreignkey")
		batch_op.create_foreign_key("fk_Message_user_id_User", "User", ["user_id"], ["id"])
	op.rename_table("guilds", "Guild")


def downgrade() -> None:
	op.rename_table("Guild", "guilds")
	with op.batch_alter_table("Message") as batch_op:
		batch_op.drop_constraint("fk_Message_user_id_User", type_="foreignkey")
		batch_op.create_foreign_key("fk_messages_user_id_users", "User", ["user_id"], ["id"])
	op.rename_table("Message", "messages")
	op.rename_table("Channel", "channels")
	op.rename_table("User", "users")
