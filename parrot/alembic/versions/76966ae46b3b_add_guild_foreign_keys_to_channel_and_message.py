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
	with op.batch_alter_table("channel") as batch_op:
		batch_op.add_column(
			sa.Column(
				"guild_id",
				sa.BigInteger,
				# sa.ForeignKey("guild.id"),
				nullable=False,
			),
		)
		# Fixes `ValueError: Constraint must have a name`
		# TODO: better solution would be to define a naming convention
		batch_op.create_foreign_key(
			"fk_channel_guild_id", "guild", ["guild_id"], ["id"]
		)
	with op.batch_alter_table("message") as batch_op:
		batch_op.add_column(
			sa.Column(
				"guild_id",
				sa.BigInteger,
				nullable=False,
			),
		)
		batch_op.create_foreign_key(
			"fk_message_guild_id", "guild", ["guild_id"], ["id"]
		)


def downgrade() -> None:
	op.drop_column("message", "guild_id")
	op.drop_column("channel", "guild_id")
	op.drop_constraint("fk_message_guild_id", "message", type_="foreignkey")
	op.drop_constraint("fk_channel_guild_id", "channel", type_="foreignkey")
