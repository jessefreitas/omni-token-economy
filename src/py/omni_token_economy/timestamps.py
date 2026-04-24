"""ISO timestamp truncation at configurable precision."""
from __future__ import annotations

from .types import TimestampPrecision

_PRECISION_LENGTH: dict[TimestampPrecision, int] = {
    "year": 4,
    "month": 7,
    "day": 10,
    "hour": 13,
    "minute": 16,
    "second": 19,
}


def compact_timestamp(
    ts: str | None,
    precision: TimestampPrecision = "minute",
) -> str | None:
    """Normalize ' ' to 'T' and truncate to requested precision. Returns None for empty input."""
    if not ts:
        return None
    normalized = ts.replace(" ", "T")
    target = _PRECISION_LENGTH[precision]
    if len(normalized) <= target:
        return normalized
    return normalized[:target]
