"""
This whole file is hacky nonsense from top to bottom.
If you're looking at it, I'm sorry.
"""
from typing import Callable, Optional
from asyncio import AbstractEventLoop

import asyncio
import time
import threading
import inspect


def synchronize(fun: Callable, loop: Optional[AbstractEventLoop]=None, *args) -> Callable:
    """ Make an async function sync. """
    if loop is None:
        def synchronized(*args) -> None:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(fun(*args))
            loop.close()
    else:
        def synchronized(*args) -> None:
            asyncio.run_coroutine_threadsafe(fun(*args), loop)
    return synchronized


class set_interval:
    def __init__(self, *args, callback: Callable, interval: float, loop: Optional[AbstractEventLoop]=None) -> None:
        """
        Based on doom's recreation of JavaScript's setInterval function.
        https://stackoverflow.com/a/48709380
        """
        if inspect.iscoroutinefunction(callback):
            callback = synchronize(callback, loop)

        self.callback = callback
        self.args = args
        self.interval = interval / 1000
        self.stop_event = threading.Event()

        thread = threading.Thread(target=self.__set_interval)
        thread.start()

    def __set_interval(self) -> None:
        """ what the heck """
        next_time = time.time() + self.interval
        while not self.stop_event.wait(next_time - time.time()):
            next_time += self.interval
            self.callback(*(self.args))

    def cancel(self) -> None:
        self.stop_event.set()
