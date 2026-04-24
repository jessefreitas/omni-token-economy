import type { TimestampPrecision } from './types.js';

const PRECISION_LENGTH: Record<TimestampPrecision, number> = {
  year: 4,
  month: 7,
  day: 10,
  hour: 13,
  minute: 16,
  second: 19,
};

/**
 * Normalize and truncate an ISO-ish timestamp to the requested precision.
 * Accepts "2026-04-20 20:59:17.178180+00:00" and "2026-04-20T20:59:17-03:00".
 * Returns null for falsy input.
 */
export function compactTimestamp(
  ts: string | null | undefined,
  precision: TimestampPrecision = 'minute',
): string | null {
  if (!ts) return null;
  const normalized = ts.replace(' ', 'T');
  const target = PRECISION_LENGTH[precision];
  if (normalized.length <= target) return normalized;
  return normalized.slice(0, target);
}
