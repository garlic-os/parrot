:: pwd should be ${workspaceFolder}

@echo off

del parrot.sqlite3 /Q
python -m parrot.alembic.generate_test_database
pushd parrot
    alembic upgrade head
popd
