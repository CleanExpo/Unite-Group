"""Proactive client-side rate limiter (spec §11): token bucket <=20 RPM + RPD counter.

Proactive, not reactive-on-429. `now_fn` is injectable so tests are deterministic
(no wall-clock dependency)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable


@dataclass
class RateLimiter:
    rpm: int = 20
    rpd: int = 1000
    now_fn: Callable[[], float] = field(default=None)  # seconds; injected in tests
    _events: list[float] = field(default_factory=list)
    _day_count: int = 0

    def __post_init__(self):
        if self.now_fn is None:
            import time
            self.now_fn = time.monotonic

    def allow(self) -> bool:
        """Return True if a request may proceed now (and records it). False if it
        would breach the per-minute or per-day ceiling."""
        now = self.now_fn()
        # prune events older than 60s
        self._events = [t for t in self._events if now - t < 60.0]
        if len(self._events) >= self.rpm:
            return False
        if self._day_count >= self.rpd:
            return False
        self._events.append(now)
        self._day_count += 1
        return True

    @property
    def day_count(self) -> int:
        return self._day_count
