"""edit move avatar info to separate table

Revision ID: 7627b05ccc30
Revises: f7829760584b
Create Date: 2024-12-28 19:06:10.371272

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel as sm
from parrot.core.types import Snowflake

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7627b05ccc30"
down_revision: str | None = "f7829760584b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


class AvatarInfo(sm.SQLModel, table=True):
	id: int | None = sm.Field(primary_key=True, default=None)
	member_id: Snowflake = sm.Field(foreign_key="Member.id", primary_key=True)
	guild_id: Snowflake = sm.Field(foreign_key="Guild.id")
	original_avatar_url: str
	antiavatar_url: str
	antiavatar_message_id: Snowflake

class Registration(sm.SQLModel, table=True):
	id: int | None = sm.Field(primary_key=True, default=None)
	member_id: Snowflake = sm.Field(foreign_key="Member.id")
	guild_id: Snowflake = sm.Field(foreign_key="Guild.id")
	original_avatar_url: str
	modified_avatar_url: str
	modified_avatar_message_id: Snowflake

# Configure SQLModel with all currently defined models (which should just be
# the ones above)
target_metadata = sm.SQLModel.metadata
session = sm.Session(bind=op.get_bind())


def upgrade() -> None:
	op.create_table(
		"AvatarInfo",
		sa.Column("member_id", sa.BigInteger, sa.ForeignKey("Member.id"), primary_key=True),
		sa.Column("guild_id", sa.BigInteger, sa.ForeignKey("Guild.id"), nullable=False),
		sa.Column("original_avatar_url", sa.String, nullable=False),
		sa.Column("antiavatar_url", sa.String, nullable=False),
		sa.Column("antiavatar_message_id", sa.BigInteger, nullable=False),
	)

	# Copy all Registrations that have non-null avatar info to the new
	# AvatarInfo table
	statement = sm.select(Registration) \
		.where(Registration.original_avatar_url != None)
	db_registrations = session.exec(statement).all()
	json_registrations = (reg.model_dump() for reg in db_registrations)
	db_avatar_infos = (
		AvatarInfo(
			member_id=json["member_id"],
			guild_id=json["guild_id"],
			original_avatar_url=json["original_avatar_url"],
			antiavatar_url=json["modified_avatar_url"],
			antiavatar_message_id=json["modified_avatar_message_id"],
		)
		for json in json_registrations
	)
	session.add_all(db_avatar_infos)
	session.commit()

	# Delete the old avatar info fields from the Registration table
	op.drop_column("Registration", "original_avatar_url")
	op.drop_column("Registration", "modified_avatar_url")
	op.drop_column("Registration", "modified_avatar_message_id")


def downgrade() -> None:
	# Add the old avatar info fields back to the Registration table
	op.add_column("Registration", sa.Column("original_avatar_url", sa.String, nullable=False))
	op.add_column("Registration", sa.Column("modified_avatar_url", sa.String, nullable=False))
	op.add_column("Registration", sa.Column("modified_avatar_message_id", sa.BigInteger, nullable=False))

	statement = sm \
		.select(AvatarInfo) \
		.where(
			# type: ignore -- SQLalchemy properties are magic and this actually does have .in_ on it
			AvatarInfo.member_id.in_(  # type: ignore
				sm.select(Registration.member_id) \
				.where(Registration.member_id == AvatarInfo.member_id)
			)
		)
	db_registered_avatar_infos = session.exec(statement).all()
	json_infos = (info.model_dump() for info in db_registered_avatar_infos)
	db_registrations = (
		Registration(
			member_id=json["member_id"],
			guild_id=json["guild_id"],
			original_avatar_url=json["original_avatar_url"],
			modified_avatar_url=json["antiavatar_url"],
			modified_avatar_message_id=json["antiavatar_message_id"],
		)
		for json in json_infos
	)
	session.add_all(db_registrations)
	session.commit()