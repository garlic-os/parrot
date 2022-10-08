import aiohttp
import asyncio
import urllib.parse
import os
import logging
from discord import File, TextChannel, User
from discord.errors import NotFound
import config
from utils.image import modify_avatar


class AvatarManager:
    def __init__(
        self,
        loop,
        db,
        http_session: aiohttp.ClientSession,
        fetch_channel
    ):
        self.loop = loop
        self.db = db
        self.http_session = http_session
        self.fetch_channel = fetch_channel


    async def fetch(self, user: User) -> str:
        res = self.db.execute(
            """
            SELECT original_avatar_url,
                   modified_avatar_url,
                   modified_avatar_message_id
            FROM users WHERE id = ?
            """,
            (user.id,)
        )
        (
            original_avatar_url,
            modified_avatar_url,
            modified_avatar_message_id
        ) = res.fetchone()

        avatar_channel = await self.fetch_channel(config.AVATAR_STORE_CHANNEL_ID)

        if original_avatar_url is not None:
            # User hasn't changed their avatar since last time they did
            # |imitate, so we can use the cached modified avatar.
            if self._avatar_url_id(user.display_avatar.url) == self._avatar_url_id(original_avatar_url):
                return modified_avatar_url

            # Else, user has changed their avatar.
            # Respect the user's privacy by deleting the message with their old
            # avatar.
            # Don't wait for this operation to complete before continuing.
            asyncio.create_task(
                self._delete_message(avatar_channel, modified_avatar_message_id)
            )

        # User has changed their avatar since last time they did |imitate or has
        # not done |imitate before, so we must create a modified version of
        # their avatar.
        # We employ the classic Discord As A CDN method to cache the modified
        # avatars by posting them to a Discord channel and storing the message
        # IDs for later.
        modified_avatar, file_format = await modify_avatar(user)
        message = await avatar_channel.send(
            file=File(modified_avatar, f"{user.id}.{file_format}")
        )

        # Update the avatar database with the new avatar URL.
        self.db.execute(
            """
            UPDATE users
            SET original_avatar_url = ?,
                modified_avatar_url = ?,
                modified_avatar_message_id = ?
            WHERE id = ?
            """,
            (
                user.display_avatar.url,
                message.attachments[0].url,
                message.id,
                user.id
            )
        )
        return modified_avatar_url


    async def _delete_message(
        self,
        channel: TextChannel,
        message_id: int
    ) -> None:
        try:
            message = await channel.fetch_message(message_id)
        except NotFound:
            logging.warn(
                f"Tried to delete message {message_id} from the avatar store, "
                "but it doesn't exist."
            )
        else:
            await message.delete()


    def _avatar_url_id(self, url: str) -> str:
        path = urllib.parse.urlparse(url).path
        return os.path.splitext(path)[0]
