import aiohttp
import asyncio
import urllib
import os
import logging
from io import BytesIO
from PIL import Image, ImageOps
from discord import File, TextChannel, User
from discord.errors import NotFound
import config


class AvatarManager:
    def __init__(
        self,
        db,
        http_session: aiohttp.ClientSession,
        fetch_channel
    ):
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
            if self._avatar_url_id(user.avatar.url) == self._avatar_url_id(original_avatar_url):
                return modified_avatar_url

            # Else, user has changed their avatar.
            # Respect the user's privacy by deleting the message with their old
            # avatar.
            # Don't wait for this operation to complete before continuing.
            asyncio.create_task(
                self._delete_message(avatar_channel, modified_avatar_message_id)
            )
            # Awaiting it anyway until I can figure out this "you're not
            # actually in an async context" error
            # await self._delete_message(avatar_channel, modified_avatar_message_id)

        # User has changed their avatar since last time they did |imitate or has
        # not done |imitate before, so we must create a modified version of
        # their avatar.
        # Ideally, we would just upload this modified avatar as the imitate
        # webhook's avatar directly, but Discord only accepts URLs for webhook
        # avatars, not files. So we must first upload the generated image to a
        # channel on Discord where we can then get the URL of the new avatar
        # to use in a webhook (Discord As A CDN!).
        # Oh well, at least we don't have to store the avatars ourselves now.
        modified_avatar = await self.modify_avatar(user.avatar.url)
        message = await avatar_channel.send(
            file=File(modified_avatar, f"{user.id}.webp")
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
                user.avatar.url,
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
        return os.path.splitext(path)


    async def modify_avatar(self, image_url: str) -> BytesIO:
        """
        Mirror and invert the avatar.
        For use as the avatar in an imitate message to distinguish them from
        messages from real users.
        """
        async with self.http_session.get(image_url) as response:
            with Image.open(BytesIO(await response.read())) as image:
                image = ImageOps.mirror(image)
                image = ImageOps.invert(image)
                result = BytesIO()
                image.save(result, format="WEBP")
                result.seek(0)
                return result
