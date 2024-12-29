"""add user wants random devolve

Revision ID: 748c84de5dcb
Revises: 139fb101f4b2
Create Date: 2024-12-24 15:33:11.898284

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "748c84de5dcb"
down_revision: str | None = "139fb101f4b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.add_column(
		"User",
		sa.Column(
			"wants_random_devolve",
			sa.Boolean,
			nullable=False,
			server_default="1",
		),
	)


def downgrade() -> None:
	op.drop_column("User", "wants_random_devolve")
