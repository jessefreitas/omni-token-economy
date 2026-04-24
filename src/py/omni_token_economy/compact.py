"""Core compaction primitives. Mirrors src/ts/compact.ts for TS↔Py parity."""
from __future__ import annotations

from typing import Any

from .estimate import byte_length, estimate_object_tokens, estimate_tokens
from .redundancy import is_redundant
from .timestamps import compact_timestamp
from .types import (
    CompactRules,
    CompactSecretOptions,
    CompressContextOptions,
    CompressContextResult,
    Telemetry,
    WithTelemetry,
)

Record = dict[str, Any]


def _telemetry_for(before: Any, after: Any) -> Telemetry:
    bb = byte_length(before)
    ba = byte_length(after)
    tb = estimate_object_tokens(before)
    ta = estimate_object_tokens(after)
    saved = max(0, tb - ta)
    pct = round((saved / tb) * 1000) / 10 if tb > 0 else 0.0
    return Telemetry(bb, ba, tb, ta, saved, pct)


def compact_record(record: Record, rules: CompactRules | None = None) -> Record:
    """Remove redundancy per declarative rules. Pure — input not mutated."""
    r: CompactRules = rules or {}
    whitelist = r.get("whitelist_fields")
    drop_fields = r.get("drop_fields", [])
    redundant_pairs = r.get("redundant_pairs", [])
    timestamp_fields = r.get("timestamp_fields", [])
    timestamp_precision = r.get("timestamp_precision", "minute")
    strip_prefixes = r.get("strip_tag_prefixes", [])
    tags_field = r.get("tags_field", "tags")
    threshold = r.get("redundancy_threshold", 0.6)

    if whitelist:
        out: Record = {k: record[k] for k in whitelist if k in record}
    else:
        out = dict(record)

    for f in drop_fields:
        out.pop(f, None)

    for maybe, ref in redundant_pairs:
        a = out.get(maybe)
        b = out.get(ref)
        if isinstance(a, str) and isinstance(b, str) and is_redundant(a, b, threshold):
            out.pop(maybe, None)

    for tf in timestamp_fields:
        v = out.get(tf)
        if isinstance(v, str):
            new = compact_timestamp(v, timestamp_precision)
            if new is not None:
                out[tf] = new

    if strip_prefixes:
        tags = out.get(tags_field)
        if isinstance(tags, list):
            cleaned = [
                t for t in tags
                if not (isinstance(t, str) and any(t.startswith(p) for p in strip_prefixes))
            ]
            if cleaned:
                out[tags_field] = cleaned
            else:
                out.pop(tags_field, None)

    return out


def compact_records(records: list[Record], rules: CompactRules | None = None) -> list[Record]:
    return [compact_record(r, rules) for r in records]


def compact_record_with_telemetry(
    record: Record,
    rules: CompactRules | None = None,
) -> WithTelemetry[Record]:
    value = compact_record(record, rules)
    return WithTelemetry(value=value, metrics=_telemetry_for(record, value))


def compress_context(
    items: list[Record],
    options: CompressContextOptions | None = None,
) -> CompressContextResult[Record]:
    """Adaptive: keep first N verbatim, replace body with summary for the rest if over budget."""
    o: CompressContextOptions = options or {}
    max_tokens = o.get("max_tokens", 3000)
    keep_full_first = o.get("keep_full_first", 5)
    content_field = o.get("content_field", "content")
    summary_field = o.get("summary_field", "summary")
    summary_max_chars = o.get("summary_max_chars", 300)
    telemetry_flag = o.get("telemetry", False)

    total = sum(
        estimate_tokens(
            str(i.get(content_field, "")) + str(i.get(summary_field, ""))
        )
        for i in items
    )

    if total <= max_tokens:
        result: CompressContextResult[Record] = CompressContextResult(
            items=list(items),
            compressed=False,
        )
        if telemetry_flag:
            result.metrics = _telemetry_for(items, list(items))
        return result

    compressed: list[Record] = []
    for idx, item in enumerate(items):
        if idx < keep_full_first:
            compressed.append(item)
        else:
            summary = str(item.get(summary_field, ""))[:summary_max_chars]
            slim: Record = dict(item)
            slim[content_field] = summary
            slim["_compressed"] = True
            compressed.append(slim)

    result = CompressContextResult(items=compressed, compressed=True)
    if telemetry_flag:
        result.metrics = _telemetry_for(items, compressed)
    return result


def compact_secret(secret: Record, options: CompactSecretOptions) -> Record:
    """Return ONLY whitelisted metadata. Never the value. Unknown fields dropped."""
    whitelist = options["whitelist"]
    return {k: secret[k] for k in whitelist if k in secret}


def compact_secrets(secrets: list[Record], options: CompactSecretOptions) -> list[Record]:
    return [compact_secret(s, options) for s in secrets]
