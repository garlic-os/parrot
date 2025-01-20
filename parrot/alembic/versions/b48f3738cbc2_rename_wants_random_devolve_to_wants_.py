"""rename wants random devolve to wants random wawa

Revision ID: b48f3738cbc2
Revises: 6759a5369727
Create Date: 2025-01-20 04:54:31.069211

"""

from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b48f3738cbc2"
down_revision: str | None = "6759a5369727"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	with op.batch_alter_table("member") as batch_op:
		batch_op.alter_column(
			"wants_random_wawa", new_column_name="wants_random_devolve"
		)


def downgrade() -> None:
	with op.batch_alter_table("member") as batch_op:
		batch_op.alter_column(
			"wants_random_devolve", new_column_name="wants_random_wawa"
		)
