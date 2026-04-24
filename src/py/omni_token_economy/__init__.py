"""omni-token-economy — biblioteca universal de compactação de tokens para LLMs."""

from .compact import (
    compact_record,
    compact_records,
    compact_record_with_telemetry,
    compact_secret,
    compact_secrets,
    compress_context,
)
from .estimate import byte_length, estimate_object_tokens, estimate_tokens
from .redundancy import detect_redundancy, is_redundant
from .timestamps import compact_timestamp
from .types import (
    CompactRules,
    CompactSecretOptions,
    CompressContextOptions,
    CompressContextResult,
    Telemetry,
    TimestampPrecision,
)

__version__ = "0.1.0"

__all__ = [
    "CompactRules",
    "CompactSecretOptions",
    "CompressContextOptions",
    "CompressContextResult",
    "Telemetry",
    "TimestampPrecision",
    "byte_length",
    "compact_record",
    "compact_record_with_telemetry",
    "compact_records",
    "compact_secret",
    "compact_secrets",
    "compact_timestamp",
    "compress_context",
    "detect_redundancy",
    "estimate_object_tokens",
    "estimate_tokens",
    "is_redundant",
]
