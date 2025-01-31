"""drop message timestamp column

Turns out you can losslessly derive "created at" timestamps from Twitter
snowflakes, so there is no point in keeping a bespoke "timestamp" column

Revision ID: fd7c085ab081
Revises: 1c781052e721
Create Date: 2024-12-20 15:52:45.701284

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "fd7c085ab081"
down_revision: str | None = "1c781052e721"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.drop_column("message", "timestamp")


def downgrade() -> None:
	op.add_column(
		"message",
		sa.Column(
			"timestamp",
			sa.Integer(),
			nullable=False,
			server_default="0",
		),
	)
