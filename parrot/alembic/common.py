from types import ModuleType
from typing import Any, cast

import sqlalchemy as sa
import sqlmodel as sm


def cleanup_models(models_module: ModuleType) -> None:
	"""
	You have to do this anywhere you define or import a SQLModel model within a
	migration, or else it will be there to cause name collisions in migrations
	that come after it.
	SQLModel is designed to be intuitive, easy to use, highly compatible, and
	robust.
	"""
	for name in models_module.__all__:
		try:
			obj = getattr(models_module, name)
		except AttributeError:
			continue
		if not isinstance(obj, sm.main.SQLModelMetaclass):
			continue
		table = cast(sa.Table, getattr(obj, "__table__"))
		sm.SQLModel.metadata.remove(table)


def count(session: sm.Session, column: Any) -> int | None:  # noqa: ANN401
	return session.execute(sa.func.count(column)).scalar()
