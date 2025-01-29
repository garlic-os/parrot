"""prune orphaned messages

WARNING!!! This migration is irreversible. You should have a backup of your
database before running migrations anyway but just saying

Revision ID: cd11f5396395
Revises: fe3138aef0bd
Create Date: 2025-01-24 23:38:55.172176

"""

import logging
from collections.abc import Sequence

import sqlmodel as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "cd11f5396395"
down_revision: str | None = "fe3138aef0bd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	# fmt: off
	op.get_bind().execute(
		sa.text(
			'DELETE FROM messages '
			'WHERE id IN ('
				'SELECT rowid '
				'FROM pragma_foreign_key_check() '
				'WHERE "table" = "messages" '
				'AND "parent" = "user"'
			')'
		)
	)
	# fmt: on


def downgrade() -> None:
	logging.warning("No action taken: this migration is irreversible.")
