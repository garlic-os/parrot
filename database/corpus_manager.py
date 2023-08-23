from typing import List, Union
from discord import User, Member, Message
from utils.exceptions import NoDataError, NotRegisteredError
from utils import tag


class CorpusManager:
    def __init__(self, db, get_registered_users, command_prefix):
        self.db = db
        self.get_registered_users = get_registered_users
        self.command_prefix = command_prefix


    def add(
        self,
        user: Union[User, Member],
        messages: List[Message]
    ) -> int:
        """
        Record messages locally.
        @pre: messages should all be from one user.
        @returns: the number of new messages added.
        TODO: If the user's Markov Chain is cached, update it with the new
        information too.
        """
        self.assert_registered(user)

        # TODO: Uncomment when model.update() is implemented
        # model = self.bot.get_model(user.id)

        # Also learn from text inside embeds, if the user is a bot.
        # If it's not from a bot, it's probably just YouTube descriptions and
        # not worth learning from.
        for message in messages:
            if message.author.bot:
                for embed in message.embeds:
                    desc = embed.description
                    if isinstance(desc, str):
                        message.content += "\n" + desc
            # Thank you to Litleck for the idea to include attachment URLs.
            for attachment in message.attachments:
                message.content += " " + attachment.url

        rows = [(message.id, user.id, message.created_at, message.content)
                for message in messages]
        self.db.executemany(
            """
            INSERT OR IGNORE INTO messages (id, user_id, timestamp, content)
            VALUES (?, ?, ?, ?)
            """,
            rows
        )

        # Return the number of new messages this added to the database.
        # Not necessarily the number of messages passed in.
        res = self.db.execute("SELECT CHANGES()")
        return res.fetchone()[0]


    def edit(self, message_id: int, new_content: str) -> None:
        """ Edit a message in the database. """
        self.db.execute(
            "UPDATE messages SET content = ? WHERE id = ?",
            (new_content, message_id)
        )
        res = self.db.execute("SELECT CHANGES()")
        num_edited = res.fetchone()[0]
        if num_edited == 0:
            raise NoDataError(
                f"Message with ID {message_id} was not recorded in the first "
                "place."
            )


    def get(self, user: Union[User, Member]) -> List[str]:
        """ Get a corpus from the database by user ID. """
        self.assert_registered(user)
        res = self.db.execute(
            "SELECT content FROM messages WHERE user_id = ?", (user.id,)
        )
        corpus = [row[0] for row in res]
        if len(corpus) == 0:
            raise NoDataError(f"No data available for user {tag(user)}.")
        return corpus


    def delete(self, user: Union[User, Member]) -> None:
        """ Delete a corpus from the database. """
        self.db.execute(
            "DELETE FROM messages WHERE user_id = ?", (user.id,)
        )
        res = self.db.execute("SELECT CHANGES()")
        num_deleted = res.fetchone()[0]
        if num_deleted == 0:
            raise NoDataError(f"No data available for user {tag(user)}.")


    def delete_message(self, message_id: int) -> None:
        """ Delete a message from the database. """
        self.db.execute(
            "DELETE FROM messages WHERE id = ?", (message_id,)
        )
        res = self.db.execute("SELECT CHANGES()")
        num_deleted = res.fetchone()[0]
        if num_deleted == 0:
            raise NoDataError(
                f"Message with ID {message_id} was not recorded in the first "
                "place."
            )


    def has(self, user: Union[User, Member]) -> bool:
        """ Check if the database contains any messages from a user. """
        res = self.db.execute(
            "SELECT COUNT(*) FROM messages WHERE user_id = ?", (user.id,)
        )
        return res.fetchone()[0] > 0


    def assert_registered(self, user: Union[User, Member]) -> None:
        if not user.bot and user.id not in self.get_registered_users():
            raise NotRegisteredError(
                f"User {user} is not opted in to Parrot. To opt in, do the "
                f"`{self.bot.command_prefix}register` command."
            )
