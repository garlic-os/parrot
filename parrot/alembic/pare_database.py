"""
Take Parrot's real database and remove a certain proportion of its messages.
For testing on a smaller version of the real database.
"""

import logging

import sqlalchemy as sa
import sqlmodel as sm
from parrot import config
from parrot.alembic import prepare_for_migration
from parrot.alembic.common import count
from parrot.alembic.models import v1


V1_REVISION = "fe3138aef0bd"

PARING_FACTOR = 1_000  # 1,000 times fewer messages


def main() -> None:
	prepare_for_migration.main()

	engine = sm.create_engine(config.db_url)
	sm.SQLModel.metadata.create_all(engine)
	session = sm.Session(engine)

	logging.info("Paring message table")
	logging.info(f"Initial message count: {count(session, v1.Messages.id)}")
	session.execute(
		sm.text("""
			DELETE FROM messages WHERE id IN (
				SELECT id
				FROM (
					SELECT id, ROW_NUMBER() OVER () row_num
					FROM messages
				) t
				WHERE MOD(row_num, :factor) != 0
			)
		"""),
		{"factor": PARING_FACTOR},
	)
	logging.info(f"New message count: {count(session, v1.Messages.id)}")
	session.commit()


if __name__ == "__main__":
	main()
