"""prune orphaned messages by author

WARNING!!! This migration is irreversible. You should have a backup of your
database before running migrations anyway but just saying

Revision ID: cd11f5396395
Revises: fe3138aef0bd
Create Date: 2025-01-24 23:38:55.172176

"""

import logging
from collections.abc import Sequence

import sqlmodel as sm
from parrot.alembic.common import count
from parrot.alembic.models import v1

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "cd11f5396395"
down_revision: str | None = "fe3138aef0bd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	session = sm.Session(op.get_bind())
	logging.info(f"Initial message count: {count(session, v1.Messages.id)}")
	session.execute(
		sm.text("""
			DELETE FROM messages
			WHERE id IN (
				SELECT rowid
				FROM pragma_foreign_key_check()
				WHERE "table" = "messages"
					AND "parent" = "users"
			)
		""")
	)
	logging.info(f"New message count: {count(session, v1.Messages.id)}")
	session.commit()


def downgrade() -> None:
	logging.warning("No action taken: this migration is irreversible.")
