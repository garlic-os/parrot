"""
Types exclusively used by Alembic migrations

Can't call it types otherwise it gets confused with the one in the alembic
module
"""

# Type alias to denote a string that we know is in ISO 8601 format
ISODateString = str
