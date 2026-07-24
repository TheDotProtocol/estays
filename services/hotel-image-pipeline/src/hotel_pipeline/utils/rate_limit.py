from __future__ import annotations

import asyncio
import time
from collections import defaultdict
from urllib.parse import urlparse


class DomainRateLimiter:
    """Simple per-domain rate limiter."""

    def __init__(self, requests_per_minute: int = 20) -> None:
        self.requests_per_minute = max(1, requests_per_minute)
        self._timestamps: dict[str, list[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    def _domain(self, url: str) -> str:
        return urlparse(url).netloc.lower().removeprefix("www.")

    async def acquire(self, url: str) -> None:
        domain = self._domain(url)
        async with self._lock:
            now = time.monotonic()
            window = self._timestamps[domain]
            window[:] = [t for t in window if now - t < 60]
            if len(window) >= self.requests_per_minute:
                sleep_for = 60 - (now - window[0]) + 0.05
                await asyncio.sleep(max(0.05, sleep_for))
            self._timestamps[domain].append(time.monotonic())
