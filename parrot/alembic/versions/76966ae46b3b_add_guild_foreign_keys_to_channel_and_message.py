"""add guild foreign keys to channel and message

Revision ID: 76966ae46b3b
Revises: fd7c085ab081
Create Date: 2024-12-24 14:59:51.218876

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "76966ae46b3b"
down_revision: str | None = "fd7c085ab081"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	with op.batch_alter_table("Channel") as batch_op:
		batch_op.add_column(
			sa.Column(
				"guild_id",
				sa.BigInteger,
				sa.ForeignKey("Guild.id"),
				nullable=False,
			),
		)
	with op.batch_alter_table("Message") as batch_op:
		batch_op.add_column(
			sa.Column(
				"guild_id",
				sa.BigInteger,
				sa.ForeignKey("Guild.id"),
				nullable=False,
			),
		)


def downgrade() -> None:
	op.drop_column("Message", "guild_id")
	op.drop_column("Channel", "guild_id")

	with op.batch_alter_table("Message") as batch_op:
		batch_op.drop_constraint("fk_Message_guild_id_Guild", type_="foreignkey")
	
	with op.batch_alter_table("Channel") as batch_op:
		batch_op.drop_constraint("fk_Channel_guild_id_Channel", type_="foreignkey")
