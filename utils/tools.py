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
