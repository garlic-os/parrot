"""edit move avatar info to registration

Revision ID: 139fb101f4b2
Revises: 98da0772ccf1
Create Date: 2024-12-24 15:07:16.676599

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "139fb101f4b2"
down_revision: str | None = "98da0772ccf1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.drop_column("User", "original_avatar_url")
	op.drop_column("User", "modified_avatar_url")
	op.drop_column("User", "modified_avatar_message_id")

	op.add_column(
		"Registration",
		sa.Column("original_avatar_url", sa.String, nullable=True),
	)
	op.add_column(
		"Registration",
		sa.Column("modified_avatar_url", sa.String, nullable=True),
	)
	op.add_column(
		"Registration",
		sa.Column("modified_avatar_message_id", sa.BigInteger, nullable=True),
	)


def downgrade() -> None:
	op.drop_column("Registration", "original_avatar_url")
	op.drop_column("Registration", "modified_avatar_url")
	op.drop_column("Registration", "modified_avatar_message_id")

	op.add_column(
		"User", sa.Column("original_avatar_url", sa.String, nullable=True)
	)
	op.add_column(
		"User", sa.Column("modified_avatar_url", sa.String, nullable=True)
	)
	op.add_column(
		"User",
		sa.Column("modified_avatar_message_id", sa.BigInteger, nullable=True),
	)
