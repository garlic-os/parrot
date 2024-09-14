from typing import AsyncIterator, Callable
from discord import Message


def dummy_filter(message: Message) -> bool:
    return True


class HistoryCrawler:
    def __init__(
        self,
        histories: AsyncIterator | list[AsyncIterator],
        action: Callable[[Message], bool],
        limit: int = 100_000,
        filter: Callable[[Message], bool] = dummy_filter
    ):
        self.num_collected = 0
        self.running = True
        self._action = action
        self._limit = limit
        self._filter = filter
        if isinstance(histories, list):
            self._histories = histories
        else:
            self._histories = [histories]

    async def crawl(self) -> None:
        """
        Iterate over up to [limit] messages in the channel in
        reverse-chronological order.
        """
        for history in self._histories:
            async for message in history:
                if not self.running:
                    break
                if not self._filter(message):
                    continue
                if self._action(message):
                    self.num_collected += 1
                if self.num_collected >= self._limit:
                    break
        self.running = False

    def stop(self) -> None:
        self.running = False


__all__ = ["HistoryCrawler"]
