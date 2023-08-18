"""
crimsoBOT run_in_executor() decorator
https://github.com/crimsobot/crimsoBOT/blob/09abe19fd1ea23ed670b5e68a68dac1adc677092/crimsobot/utils/tools.py#L27
MIT License
Copyright (c) 2019 crimso, williammck
"""

from typing import Any, Awaitable, Callable

import asyncio
import functools


def executor_function(sync_function: Callable) -> Callable:
    @functools.wraps(sync_function)
    async def sync_wrapper(*args, **kwargs) -> Awaitable[Any]:
        loop = asyncio.get_event_loop()
        reconstructed_function = functools.partial(sync_function, *args, **kwargs)
        return await loop.run_in_executor(None, reconstructed_function)
    return sync_wrapper
