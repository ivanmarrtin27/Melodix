"""Rate limiting simple en memoria (por IP / clave)."""

from __future__ import annotations

import time
from collections import defaultdict


class RateLimiter:
    def __init__(self, max_calls: int, window_seconds: float):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    def allow(self, key: str) -> bool:
        now = time.time()
        bucket = self._hits[key]
        cutoff = now - self.window_seconds
        # poda in-place
        i = 0
        while i < len(bucket) and bucket[i] < cutoff:
            i += 1
        if i:
            del bucket[:i]
        if len(bucket) >= self.max_calls:
            return False
        bucket.append(now)
        return True


# Resolve / yt-dlp: caro
resolve_limiter = RateLimiter(max_calls=20, window_seconds=60)
# Stream proxy
stream_limiter = RateLimiter(max_calls=60, window_seconds=60)
# Deezer proxy (Home dispara muchas en paralelo)
deezer_limiter = RateLimiter(max_calls=180, window_seconds=60)


def client_key(request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"
