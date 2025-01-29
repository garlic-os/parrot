"""
Types exclusively used by Alembic migrations

Can't call it types otherwise it gets confused with the one in the alembic
module
"""

from typing import ClassVar

import sqlalchemy as sa
import sqlmodel as sm


# Type alias to denote a string that is (supposed to be) in ISO 8601 format
ISODateString = str


class PModel(sm.SQLModel):
	"""Parrot Model

	SQLModel class but the __table__ property is unhidden because I need it in
	my migrations
	"""

	__table__: ClassVar[sa.Table]
