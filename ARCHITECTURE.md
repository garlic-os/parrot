```
Parrot/
├── parrot/
│   ├── alembic/
│   │
│   │   [Alembic](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
│   │   database migration scripts. Can generate a new database from scratch or
│   │   migrate an old one from Parrot v1.
│   │
│   ├── assets/
│   │
│   │   Static, non-code files that Parrot needs at runtime.
│   │
│   ├── commands/
│   │
│   │   Parrot's Discord commands, grouped by category.
│   │
│   ├── db/
│   │   ├── crud/
│   │   │
│   │   │   Create-Read-Update-Delete functions for the database. Grouped by
│   │   │   table.
│   │   │
│   │   ├── manager/
│   │   │
│   │   │   Abstractions over Parrot's data, either for cache/performance, or to
│   │   │   handle dynamic assets.
│   │   │
│   │   ├── models.py
│   │   │
│   │   │   SQLModel ORM database models. Migrations are made to mirror changes
│   │   │   to this file.
│   │   │
│   │   └── ##
│   │
│   ├── event_listeners/
│   │
│   │   Hooks to (non-command) events dispatched from Discord.
│   │
│   ├── utils/
│   │
│   │   The rest of Parrot's modules. Anything that is used in more than one
│   │   place and/or is bulky goes here.
│   │
│   └── ##
│
├── config.py
│
│   Created from config.template.py in the same directory. Stores constants that
│   you may feel like changing.
│
├── main.py
│
│   Parrot program entry point. Instantiation of Parrot is handled here.
│
└── ##

```

# Notes
**Some type annotations are surrounded in quotes. i.e.,**
```py
bot: "Parrot"
# instead of:
bot: Parrot
```
I didn't just do that for no reason — these types are that way to prevent 
circular imports at runtime. They work by being only available to a static type 
checkers like Pylance. You will usually see their accompanying import wrapped inside an `if TYPE_CHECKING:` statement, so Pylance can see them, type 
annotations don't matter in Python at runtime anyway, and everyone's happy.