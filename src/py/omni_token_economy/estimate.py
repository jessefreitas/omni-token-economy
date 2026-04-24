"""Heuristic token and byte estimation. ~3 chars per token for mixed PT/EN/code."""
from __future__ import annotations

import json
import math
from typing import Any


def estimate_tokens(text: str | None) -> int:
    """Estimate tokens: ceil(len / 3). Not a real tokenizer — good enough for budgeting."""
    if not text:
        return 0
    return math.ceil(len(text) / 3)


def byte_length(value: Any) -> int:
    """UTF-8 byte length of a value (stringified if not a string)."""
    s = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    return len(s.encode("utf-8"))


def estimate_object_tokens(obj: Any) -> int:
    """Estimate tokens for an arbitrary serializable object."""
    return estimate_tokens(json.dumps(obj, ensure_ascii=False))
