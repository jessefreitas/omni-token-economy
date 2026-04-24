"""Paridade de testes com tests/ts/compact.test.ts — cobre a mesma API em Python."""
from __future__ import annotations

from omni_token_economy import (
    compact_record,
    compact_record_with_telemetry,
    compact_records,
    compact_secret,
    compact_secrets,
    compact_timestamp,
    compress_context,
    detect_redundancy,
    estimate_object_tokens,
    estimate_tokens,
    is_redundant,
)

# ─── estimate_tokens ──────────────────────────────────────────────────


def test_estimate_tokens_empty():
    assert estimate_tokens("") == 0
    assert estimate_tokens(None) == 0


def test_estimate_tokens_ceil():
    assert estimate_tokens("abc") == 1
    assert estimate_tokens("abcd") == 2
    assert estimate_tokens("a" * 300) == 100


# ─── redundancy ───────────────────────────────────────────────────────


def test_detect_redundancy_identical():
    assert detect_redundancy("hello world", "hello world") == 1.0


def test_detect_redundancy_contained():
    assert detect_redundancy(
        "RTK analisado",
        "RTK (Rust Token Killer) analisado em detalhe",
    ) == 1.0


def test_detect_redundancy_overlap():
    r = detect_redundancy("um dois três", "um dois quatro")
    assert 0.6 < r < 0.7


def test_detect_redundancy_none():
    assert detect_redundancy("alpha beta", "gamma delta") == 0.0


def test_is_redundant_threshold():
    assert is_redundant("um dois", "um dois três", 0.6) is True
    assert is_redundant("completamente diferente", "outro texto", 0.6) is False


# ─── timestamps ───────────────────────────────────────────────────────


def test_compact_timestamp_default_minute():
    assert compact_timestamp("2026-04-20T20:59:17.178180+00:00") == "2026-04-20T20:59"


def test_compact_timestamp_normalizes_space():
    assert compact_timestamp("2026-04-20 20:59:17+00:00") == "2026-04-20T20:59"


def test_compact_timestamp_precision():
    assert compact_timestamp("2026-04-20T20:59:17", "day") == "2026-04-20"
    assert compact_timestamp("2026-04-20T20:59:17", "hour") == "2026-04-20T20"
    assert compact_timestamp("2026-04-20T20:59:17", "second") == "2026-04-20T20:59:17"


def test_compact_timestamp_empty():
    assert compact_timestamp(None) is None
    assert compact_timestamp("") is None


# ─── compact_record ───────────────────────────────────────────────────


def test_compact_record_drops_redundant_summary():
    r = compact_record(
        {
            "id": "1",
            "summary": "RTK analisado",
            "content": "RTK (Rust Token Killer) analisado em detalhes",
        },
        {"redundant_pairs": [("summary", "content")]},
    )
    assert "summary" not in r
    assert "RTK" in r["content"]


def test_compact_record_keeps_unique_summary():
    r = compact_record(
        {
            "summary": "Previne injection",
            "content": "A função sanitiza input de usuário.",
        },
        {"redundant_pairs": [("summary", "content")]},
    )
    assert r["summary"] == "Previne injection"


def test_compact_record_drop_fields():
    r = compact_record(
        {"id": "1", "internal_id": "x", "updated_at": "..."},
        {"drop_fields": ["internal_id", "updated_at"]},
    )
    assert "internal_id" not in r
    assert "updated_at" not in r
    assert r["id"] == "1"


def test_compact_record_whitelist_wins():
    r = compact_record(
        {"id": "1", "a": 2, "b": 3, "c": 4},
        {"whitelist_fields": ["id", "a"]},
    )
    assert sorted(r.keys()) == ["a", "id"]


def test_compact_record_timestamp_fields():
    r = compact_record(
        {"created_at": "2026-04-20T20:59:17.178180+00:00"},
        {"timestamp_fields": ["created_at"]},
    )
    assert r["created_at"] == "2026-04-20T20:59"


def test_compact_record_strip_tag_prefix():
    r = compact_record(
        {"tags": ["project:omniforge", "category:arch", "priority:high"]},
        {"strip_tag_prefixes": ["project:"]},
    )
    assert r["tags"] == ["category:arch", "priority:high"]


def test_compact_record_removes_empty_tags_field():
    r = compact_record(
        {"tags": ["project:foo"]},
        {"strip_tag_prefixes": ["project:"]},
    )
    assert "tags" not in r


def test_compact_record_does_not_mutate_input():
    original = {"id": "1", "internal_id": "x"}
    r = compact_record(original, {"drop_fields": ["internal_id"]})
    assert original["internal_id"] == "x"
    assert "internal_id" not in r


# ─── compact_records ──────────────────────────────────────────────────


def test_compact_records_maps():
    rs = compact_records(
        [{"a": 1, "b": 2}, {"a": 3, "b": 4}],
        {"drop_fields": ["b"]},
    )
    assert rs == [{"a": 1}, {"a": 3}]


# ─── compress_context ─────────────────────────────────────────────────


def test_compress_context_under_budget():
    items = [{"content": "short", "summary": "s", "id": i} for i in range(3)]
    r = compress_context(items, {"max_tokens": 1000, "keep_full_first": 5})
    assert r.compressed is False
    assert len(r.items) == 3


def test_compress_context_over_budget():
    long_content = "x" * 3000
    items = [
        {"content": long_content, "summary": f"summary {i}", "id": i}
        for i in range(10)
    ]
    r = compress_context(items, {"max_tokens": 1000, "keep_full_first": 3})
    assert r.compressed is True
    assert "_compressed" not in r.items[0]
    assert "_compressed" not in r.items[2]
    assert r.items[3]["_compressed"] is True
    assert r.items[3]["content"] == "summary 3"


def test_compress_context_telemetry():
    items = [
        {"content": "x" * 3000, "summary": f"s{i}", "id": i}
        for i in range(10)
    ]
    r = compress_context(
        items,
        {"max_tokens": 1000, "keep_full_first": 3, "telemetry": True},
    )
    assert r.metrics is not None
    assert r.metrics.reduction_percent > 30


# ─── compact_secret ───────────────────────────────────────────────────


def test_compact_secret_whitelist_only():
    # Fixture sanitizada — nunca usar token real em teste. Ver CLAUDE.md #5.
    secret = {
        "key": "example_api_token",
        "value": "FAKE_TEST_TOKEN_DO_NOT_USE",
        "description": "Exemplo sintético para teste",
        "category": "api",
        "created_at": "2026-01-01",
    }
    safe = compact_secret(
        secret,
        {"whitelist": ["key", "description", "category"]},
    )
    assert sorted(safe.keys()) == ["category", "description", "key"]
    assert "value" not in safe


def test_compact_secrets_list():
    rs = compact_secrets(
        [{"key": "a", "value": "FAKE_A"}, {"key": "b", "value": "FAKE_B"}],
        {"whitelist": ["key"]},
    )
    assert rs == [{"key": "a"}, {"key": "b"}]


# ─── telemetry variant ────────────────────────────────────────────────


def test_compact_record_with_telemetry():
    wrapped = compact_record_with_telemetry(
        {
            "id": "1",
            "summary": "dupe",
            "content": "dupe completa com muito texto redundante",
            "extra": "remover",
        },
        {
            "redundant_pairs": [("summary", "content")],
            "drop_fields": ["extra"],
        },
    )
    assert "summary" not in wrapped.value
    assert "extra" not in wrapped.value
    assert wrapped.metrics.tokens_before > wrapped.metrics.tokens_after
    assert wrapped.metrics.reduction_percent > 0


def test_estimate_object_tokens_nonzero():
    assert estimate_object_tokens({"a": "hello", "b": "world"}) > 0
