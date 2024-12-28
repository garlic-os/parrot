import functools
import inspect
import logging
from collections import OrderedDict
from collections.abc import Awaitable, Callable, Sized
from typing import Any, cast


class LastUpdatedOrderedDict[K, V](OrderedDict):
	"""Store items in the order the keys were last added"""

	def __setitem__(self, key: K, value: V):
		super().__setitem__(key, value)
		self.move_to_end(key)


class ALRUCache[Param, Ret]:
	def __init__(self, *, max_count: int = 10):
		self.max_size = max_count
		self.cache = LastUpdatedOrderedDict[Param, Ret]()

	def __call__[**P](self, fn: Callable[[Param], Awaitable[Ret]]):
		@functools.wraps(fn)
		async def decorated(
			first_param: Param, *args: P.args, **kwargs: P.kwargs
		) -> Ret:
			if first_param in self.cache:
				self.cache.move_to_end(first_param)
				return self.cache[first_param]
			result = await fn(first_param, *args, **kwargs)
			if len(self.cache) >= self.max_size:
				self.cache.popitem(last=False)
			self.cache[first_param] = result
			return result

		return decorated


class ALRUCacheByMemSize[Param, Ret: Sized]:
	"""
	A stupidly-specific yet overengineered LRU cache wrapper.

	Made for async functions and limits by MEMORY SIZE (len() of cached objects)
	instead of by count.

	Also:
	- Works transparently with both functions and methods
	- Uses only the first parameter passed in the caching and ignores the rest
	  (my one spark of sense where I made a design decision that simplifies
	  something)
	- You can provide your own function to derive a key to cache arguments by
	  if you want

	I'm not happy with this because it's too complex. But it works
	"""

	type OtherSelf = Any
	type AsyncFunction = Callable[[Param], Awaitable[Ret]]
	type AsyncMethod = Callable[[OtherSelf, Param], Awaitable[Ret]]
	fn: AsyncFunction

	def __init__(
		self,
		*,
		max_mem_size: int = 1 * 1024 * 1024,  # 1 MB
		key: Callable[[Param], Any] = lambda p: p,
	):
		self.max_mem_size = max_mem_size
		self.key_fn = key
		self.space_used = 0
		self.cache = LastUpdatedOrderedDict[Any, Ret]()

	async def _decorated_impl[**P](
		self, first_param: Param, *args: P.args, **kwargs: P.kwargs
	) -> Ret:
		key = self.key_fn(first_param)
		if key in self.cache:
			logging.debug(f"Cache hit: {key}")
			self.cache.move_to_end(key)
			return self.cache[key]
		logging.debug(f"Cache miss: {key}")
		result = await self.fn(key, *args, **kwargs)
		while self.space_used + len(result) > self.max_mem_size:
			_, evicted = self.cache.popitem(last=False)
			logging.debug(
				f" ** Full ({self.space_used}/{self.max_mem_size}); "
				f"evicting: {evicted} (-{len(evicted)})"
			)
			self.space_used -= len(evicted)
		self.cache[key] = result
		self.space_used += len(result)
		return result

	def __call__[**P](self, fn: AsyncFunction | AsyncMethod):
		"""
		Is this really what you have to do just to be able to wrap either a
		function or a method?
		"""
		if inspect.ismethod(fn):

			@functools.wraps(cast(ALRUCacheByMemSize.AsyncMethod, fn))
			async def decorated_method(
				self_: ALRUCacheByMemSize.OtherSelf,
				first_param: Param,
				*args: P.args,
				**kwargs: P.kwargs,
			) -> Ret:
				self.fn = functools.partial(fn, self_)
				return await self._decorated_impl(first_param, *args, **kwargs)

			return decorated_method
		else:
			self.fn = cast(ALRUCacheByMemSize.AsyncFunction, fn)

			@functools.wraps(cast(ALRUCacheByMemSize.AsyncFunction, fn))
			async def decorated_function(
				first_param: Param, *args: P.args, **kwargs: P.kwargs
			) -> Ret:
				return await self._decorated_impl(first_param, *args, **kwargs)

			return decorated_function
