"""drop message timestamp column

Turns out you can losslessly derive "created at" timestamps from Twitter
snowflakes! You just have to know the difference between the time encoded in one
for a service, and the real time an event occurred.
That's parrot.utils.time.DISCORD_EVENT_TIME_CORRECTION now.
So in that case, I'll just drop the timestamp table and derive timestamps from
the IDs I already have.

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
			sa.BigInteger(),
			nullable=False,
			server_default="0",
		),
	)
