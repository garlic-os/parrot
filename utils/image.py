"""
crimsoBOT image processing
https://github.com/crimsobot/crimsoBOT/blob/master/crimsobot/utils/image.py
MIT License
Copyright (c) 2019 crimso, williammck
"""

from io import BytesIO
from typing import Any, Callable, List, Mapping, Optional, Tuple
from discord import User

import logging
import aiohttp
from PIL import Image, ImageSequence, ImageOps

from assets import GIF_RULES, IMAGE_RULES
from utils import tools as p
from utils import tag


def gif_frame_transparency(img: Image.Image) -> Image.Image:
    # get alpha mask
    alpha = img.convert("RGBA").split()[-1]
    # convert back to P mode but only using 255 of available 256 colors
    img = img.convert("RGB").convert("P", palette=Image.ADAPTIVE, colors=255)
    # set all pixel values in alpha below threshhold to 255 and the rest to 0
    mask = Image.eval(alpha, lambda a: 255 if a <= 88 else 0)
    # paste the color of index 255 and use alpha as a mask
    img.paste(255, mask)  # the transparency index will later be set to 255
    return img


def image_to_buffer(
    image_list: List[Image.Image],
    durations: Optional[Tuple[int, ...]] = None,
    loops: Optional[bool] = None
) -> BytesIO:
    fp = BytesIO()

    if not durations:
        image_list[0].save(fp, "WEBP")
    else:
        giffed_frames = []
        for frame in image_list:
            new_frame = gif_frame_transparency(frame)
            giffed_frames.append(new_frame)
        if loops:
            giffed_frames[0].save(fp, format="GIF", transparency=255, append_images=giffed_frames[1:],
                                  save_all=True, duration=durations, loop=0, disposal=2)
        else:
            giffed_frames[0].save(fp, format="GIF", transparency=255, append_images=giffed_frames[1:],
                                  save_all=True, duration=durations, disposal=2)
    fp.seek(0)
    return fp


async def fetch_image(url: str) -> Image.Image:
    """ Determine type of input, return image file. """
    session = aiohttp.ClientSession()
    try:
        async with session.get(url, allow_redirects=False) as response:
            img_bytes = await response.read()
    except Exception as e:
        await session.close()
        raise e
    await session.close()
    return Image.open(BytesIO(img_bytes))


# below are the blocking image functions (that support GIF) which require the executor_function wrapper
def invert_flip_img(img: Image.Image, _) -> Image.Image:
    # get image size, resize if too big
    width, height = img.size
    if max(width, height) > 500:
        ratio = max(width, height) / 500
        img = img.resize((int(width / ratio), int(height / ratio)), resample=Image.BICUBIC)

    # alpha mask (for later)
    alpha = img.convert("RGBA").split()[-1]
    img = img.convert("RGB")

    img = ImageOps.mirror(img)
    img = ImageOps.invert(img)
    img.putalpha(alpha)
    return img


def resize_img(img: Image.Image, scale: float) -> Image.Image:
    width, height = img.size
    return img.resize(
        (int(width * scale), int(height * scale)),
        resample=Image.ANTIALIAS
    )


IMG_PROCESS_FUNCTIONS: Mapping[str, Callable[Image.Image, Any]] = {
    "invertflip": invert_flip_img,
    "resize": resize_img,
}


@p.executor_function
def process_lower_level(img: Image.Image, effect: str, arg: int) -> BytesIO:
    # this will only loop once for still images
    frames: List[Image.Image] = []
    durations: List[int] = []

    # if a GIF loops, it will have the attribute loop = 0; if not, then attribute does not exist
    image_loop = getattr(img.info, "loop", False)

    for _ in ImageSequence.Iterator(img):
        if image_loop:
            duration: int = img.info["duration"]
            durations.append(duration)
        img_out = IMG_PROCESS_FUNCTIONS[effect](img.convert("RGBA"), arg)
        frames.append(img_out)

    fp = image_to_buffer(frames, tuple(durations), image_loop)
    return fp


async def modify_avatar(user: User) -> Tuple[BytesIO, str]:
    # grab user image and covert to RGBA
    img = await fetch_image(user.avatar.url)
    is_gif = getattr(img, "is_animated", False)

    if is_gif:
        if img.n_frames > GIF_RULES["max_frames"]:
            raise NotImplementedError("GIF too long; need to process only first frame")
            return None, None
        else:
            logging.info(
                f"Processing GIF avatar for {tag(user)}... ",
                f"{img.width} \u2A09 {img.height} pixels · {img.n_frames} frames"
            )

    # original image begins processing
    fp = await process_lower_level(img, "invertflip", 0)
    n_bytes = fp.getbuffer().nbytes

    # if file too large to send via Discord, then resize
    while n_bytes > IMAGE_RULES["max_filesize"]:
        # recursively resize image until it meets Discord filesize limit
        img = Image.open(fp)
        scale = 0.9 * IMAGE_RULES["max_filesize"] / n_bytes  # 0.9x bias to help ensure it comes in under max size
        fp = await process_lower_level(img, "resize", scale)
        n_bytes = fp.getbuffer().nbytes

    logging.info(f"Processed new avatar for {tag(user)}")
    return fp, img.format
