"""
Namespace for a migration's SQLModel models, so each one has a different
fully-qualified name even for models that refer to the same table.
Necessary to prevent name collisions

SQLModel is designed to be intuitive, easy to use, highly compatible, and
robust.
"""
