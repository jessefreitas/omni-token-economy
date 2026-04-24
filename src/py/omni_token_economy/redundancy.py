"""Redundancy detection via asymmetric word overlap."""
from __future__ import annotations

import re

_WORD_RE = re.compile(r"[^\W_]+", re.UNICODE)


def _words(s: str) -> set[str]:
    return set(_WORD_RE.findall(s.lower()))


def detect_redundancy(a: str, b: str) -> float:
    """Return |words(a) ∩ words(b)| / |words(a)|. 0.0 when either empty.

    Asymmetric on purpose — measures how much of `a` is covered by `b`.
    """
    if not a or not b:
        return 0.0
    a_low = a.lower().strip()
    b_low = b.lower().strip()
    if a_low == b_low:
        return 1.0
    if a_low in b_low:
        return 1.0
    wa = _words(a_low)
    if not wa:
        return 0.0
    wb = _words(b_low)
    inter = len(wa & wb)
    return inter / len(wa)


def is_redundant(short: str, long: str, threshold: float = 0.6) -> bool:
    """True if `short` is covered by `long` above threshold."""
    return detect_redundancy(short, long) >= threshold
