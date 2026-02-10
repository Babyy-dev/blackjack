from __future__ import annotations

from app.db.redis import get_redis


def is_rate_limited(key: str, limit: int, window_seconds: int) -> bool:
    if limit <= 0 or window_seconds <= 0:
        return False
    try:
        redis = get_redis()
        count = redis.incr(key)
        if count == 1:
            redis.expire(key, window_seconds)
        return count > limit
    except Exception:
        # Fail open to avoid blocking auth if Redis is unavailable.
        return False
