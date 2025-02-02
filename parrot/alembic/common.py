from typing import Any

import sqlalchemy as sa
import sqlmodel as sm


def count(session: sm.Session, column: Any) -> int | None:  # noqa: ANN401
	return session.execute(sa.func.count(column)).scalar()
