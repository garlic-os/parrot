from typing import Callable
from discord import Message
from discord.iterators import _FilteredAsyncIterator


class ChannelCrawler:
    def __init__(self, history: _FilteredAsyncIterator, action: Callable[[Message], bool]):
        self.num_collected = 0
        self.running = True
        self._action = action
        self._history = history

    async def crawl(self) -> None:
        """
        Iterate over up to [limit] messages in the channel in
        reverse-chronological order.
        """
        async for message in self._history:
            if not self.running:
                break

            if self._action(message):
                self.num_collected += 1

        self.running = False


    def stop(self) -> None:
        self.running = False
