/**
 * Heuristic token estimation.
 *
 * Rule: ~3 chars per token for mixed PT/EN/code — a well-calibrated
 * average that holds within ±15% for typical developer content.
 *
 * Not a replacement for a real tokenizer. When exact counts matter,
 * use the provider's tokenizer (tiktoken, claude-tokenizer, etc.).
 */
export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3);
}

export function byteLength(value: unknown): number {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return Buffer.byteLength(s, 'utf8');
}

export function estimateObjectTokens(obj: unknown): number {
  return estimateTokens(JSON.stringify(obj));
}
