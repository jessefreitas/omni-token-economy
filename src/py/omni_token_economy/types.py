"""Shared type definitions. Plain dataclasses / TypedDicts for paridade com o TS."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Generic, Literal, TypedDict, TypeVar

TimestampPrecision = Literal["year", "month", "day", "hour", "minute", "second"]

T = TypeVar("T")


@dataclass(frozen=True)
class Telemetry:
    bytes_before: int
    bytes_after: int
    tokens_before: int
    tokens_after: int
    tokens_saved: int
    reduction_percent: float


@dataclass
class WithTelemetry(Generic[T]):
    value: T
    metrics: Telemetry


class CompactRules(TypedDict, total=False):
    redundant_pairs: list[tuple[str, str]]
    drop_fields: list[str]
    whitelist_fields: list[str]
    timestamp_fields: list[str]
    timestamp_precision: TimestampPrecision
    strip_tag_prefixes: list[str]
    tags_field: str
    redundancy_threshold: float


class CompressContextOptions(TypedDict, total=False):
    max_tokens: int
    keep_full_first: int
    content_field: str
    summary_field: str
    summary_max_chars: int
    telemetry: bool


@dataclass
class CompressContextResult(Generic[T]):
    items: list[T]
    compressed: bool
    metrics: Telemetry | None = None


class CompactSecretOptions(TypedDict):
    whitelist: list[str]


_ = field
_ = Any
