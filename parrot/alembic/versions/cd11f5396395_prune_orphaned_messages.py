"""prune orphaned messages

WARNING!!! This migration is irreversible. You should have a backup of your
database before running migrations anyway but just saying

Revision ID: cd11f5396395
Revises: fe3138aef0bd
Create Date: 2025-01-24 23:38:55.172176

"""

import logging
from collections.abc import Sequence

import sqlmodel as sm
from parrot.alembic import v1_schema as v1

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "cd11f5396395"
down_revision: str | None = "fe3138aef0bd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	session = sm.Session(op.get_bind())
	statement = sm.select(v1.Messages).where(v1.Messages.id == 0)
	db_messages = session.exec(statement).all()
	for db_message in db_messages:
		session.delete(db_message)
	session.commit()


def downgrade() -> None:
	logging.warning("No action taken: this migration is irreversible.")
