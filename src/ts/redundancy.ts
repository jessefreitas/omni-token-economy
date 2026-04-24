const WORD_RE = /[\p{L}\p{N}]+/gu;

function words(s: string): Set<string> {
  return new Set((s.toLowerCase().match(WORD_RE) ?? []));
}

/**
 * Word overlap ratio: |A ∩ B| / |A|.
 * Asymmetric on purpose — measures how much of `a` is covered by `b`.
 * Returns 0 when either is empty.
 */
export function detectRedundancy(a: string, b: string): number {
  if (!a || !b) return 0;
  const aLow = a.toLowerCase().trim();
  const bLow = b.toLowerCase().trim();
  if (aLow === bLow) return 1;
  if (bLow.includes(aLow)) return 1;
  const wa = words(aLow);
  const wb = words(bLow);
  if (wa.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / wa.size;
}

/**
 * True if `short` can be considered redundant given `long`.
 * Uses detectRedundancy >= threshold.
 */
export function isRedundant(short: string, long: string, threshold = 0.6): boolean {
  return detectRedundancy(short, long) >= threshold;
}
