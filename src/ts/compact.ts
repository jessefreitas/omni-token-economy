import type {
  CompactRules,
  CompactSecretOptions,
  CompressContextOptions,
  CompressContextResult,
  Telemetry,
} from './types.js';
import { isRedundant } from './redundancy.js';
import { compactTimestamp } from './timestamps.js';
import { byteLength, estimateObjectTokens, estimateTokens } from './estimate.js';

type Record_ = Record<string, unknown>;

function telemetryFor(before: unknown, after: unknown): Telemetry {
  const bytesBefore = byteLength(before);
  const bytesAfter = byteLength(after);
  const tokensBefore = estimateObjectTokens(before);
  const tokensAfter = estimateObjectTokens(after);
  const tokensSaved = Math.max(0, tokensBefore - tokensAfter);
  const reductionPercent = tokensBefore > 0
    ? Math.round((tokensSaved / tokensBefore) * 1000) / 10
    : 0;
  return { bytesBefore, bytesAfter, tokensBefore, tokensAfter, tokensSaved, reductionPercent };
}

/**
 * Remove redundancy from a single record per declarative rules.
 * Pure function — input is not mutated.
 */
export function compactRecord<T extends Record_>(input: T, rules: CompactRules = {}): Partial<T> {
  const {
    redundantPairs = [],
    dropFields = [],
    whitelistFields,
    timestampFields = [],
    timestampPrecision = 'minute',
    stripTagPrefixes = [],
    tagsField = 'tags',
    redundancyThreshold = 0.6,
  } = rules;

  let out: Record_ = whitelistFields
    ? Object.fromEntries(
      whitelistFields
        .filter(k => k in input)
        .map(k => [k, input[k]]),
    )
    : { ...input };

  for (const f of dropFields) delete out[f];

  for (const [maybeRedundant, reference] of redundantPairs) {
    const a = out[maybeRedundant];
    const b = out[reference];
    if (typeof a === 'string' && typeof b === 'string' && isRedundant(a, b, redundancyThreshold)) {
      delete out[maybeRedundant];
    }
  }

  for (const tf of timestampFields) {
    const v = out[tf];
    if (typeof v === 'string') {
      const compact = compactTimestamp(v, timestampPrecision);
      if (compact !== null) out[tf] = compact;
    }
  }

  if (stripTagPrefixes.length > 0) {
    const tags = out[tagsField];
    if (Array.isArray(tags)) {
      out[tagsField] = tags.filter(t => {
        if (typeof t !== 'string') return true;
        return !stripTagPrefixes.some(p => t.startsWith(p));
      });
      if ((out[tagsField] as unknown[]).length === 0) delete out[tagsField];
    }
  }

  return out as Partial<T>;
}

export function compactRecords<T extends Record_>(
  input: readonly T[],
  rules: CompactRules = {},
): Partial<T>[] {
  return input.map(r => compactRecord(r, rules));
}

/**
 * Adaptive compression: keep first N items verbatim, replace body with short summary for the rest.
 * Only triggers when estimated total exceeds maxTokens.
 */
export function compressContext<T extends Record_>(
  items: readonly T[],
  opts: CompressContextOptions = {},
): CompressContextResult<T | (T & { _compressed: true })> {
  const {
    maxTokens = 3000,
    keepFullFirst = 5,
    contentField = 'content',
    summaryField = 'summary',
    summaryMaxChars = 300,
    telemetry = false,
  } = opts;

  const totalTokens = items.reduce(
    (acc, i) => acc + estimateTokens(
      String(i[contentField] ?? '') + String(i[summaryField] ?? ''),
    ),
    0,
  );

  if (totalTokens <= maxTokens) {
    const out: CompressContextResult<T> = { items: [...items], compressed: false };
    if (telemetry) out.metrics = telemetryFor(items, items);
    return out;
  }

  const result = items.map((item, idx) => {
    if (idx < keepFullFirst) return item;
    const summary = String(item[summaryField] ?? '').slice(0, summaryMaxChars);
    const slim = { ...item } as Record_;
    delete slim[contentField];
    slim[contentField] = summary;
    slim._compressed = true;
    return slim as T & { _compressed: true };
  });

  const out: CompressContextResult<T | (T & { _compressed: true })> = {
    items: result,
    compressed: true,
  };
  if (telemetry) out.metrics = telemetryFor(items, result);
  return out;
}

/**
 * Return a safe view of a secret-like record — only whitelisted metadata.
 * NEVER returns the secret value. Unknown fields are dropped by default.
 */
export function compactSecret<T extends Record_>(
  input: T,
  opts: CompactSecretOptions,
): Partial<T> {
  const out: Record_ = {};
  for (const k of opts.whitelist) if (k in input) out[k] = input[k];
  return out as Partial<T>;
}

export function compactSecrets<T extends Record_>(
  input: readonly T[],
  opts: CompactSecretOptions,
): Partial<T>[] {
  return input.map(s => compactSecret(s, opts));
}

/**
 * Apply compactRecord with telemetry. Useful when you care about the numbers.
 */
export function compactRecordWithTelemetry<T extends Record_>(
  input: T,
  rules: CompactRules = {},
): { value: Partial<T>; metrics: Telemetry } {
  const value = compactRecord(input, rules);
  return { value, metrics: telemetryFor(input, value) };
}
