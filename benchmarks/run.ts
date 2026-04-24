/**
 * Benchmark: mede a economia real em datasets sintéticos representativos.
 *
 * Uso:
 *   npx tsx benchmarks/run.ts
 */
import {
  compactRecords,
  compactSecrets,
  compressContext,
  estimateObjectTokens,
} from '../src/ts/index.js';

type Row = Record<string, unknown>;

function bench(name: string, before: unknown, after: unknown, compressedFlag = false): void {
  const tb = estimateObjectTokens(before);
  const ta = estimateObjectTokens(after);
  const pct = tb > 0 ? ((tb - ta) / tb) * 100 : 0;
  const flag = compressedFlag ? ' (adaptive)' : '';
  console.log(
    `  ${name.padEnd(42)} ${String(tb).padStart(7)} → ${String(ta).padStart(7)}  (${pct.toFixed(1)}% off)${flag}`,
  );
}

function genMemoryRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `mem-${i}`,
    summary: `RTK analisado`,
    content: `RTK (Rust Token Killer) analisado em contexto de compactação. ` +
      `Detalhes técnicos sobre redução de tokens, aplicado ao caso ${i}.`,
    category: 'architecture',
    source: 'conversation',
    project: 'omniforge',
    tags: ['project:omniforge', 'priority:high', 'reviewed:true'],
    created_at: '2026-04-20T20:59:17.178180+00:00',
    created_at_brt: '2026-04-20T17:59:17-03:00',
    updated_at: '2026-04-20T20:59:17.178180+00:00',
    updated_at_brt: '2026-04-20T17:59:17-03:00',
    extracted_facts: { entities: ['RTK', 'token'], metadata: { weight: 0.87 } },
    similarity: 0.91 + (i % 10) / 1000,
  }));
}

function genApiResponses(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `req-${i}`,
    internal_id: `int-${i}-${Date.now()}`,
    title: `Order ${i}`,
    name: `Order ${i}`,
    description: `Pedido número ${i} do cliente`,
    status: 'pending',
    created_at: '2026-04-20T20:59:17.178180+00:00',
    updated_at: '2026-04-20T20:59:17.178180+00:00',
    _metadata: { cache_hit: false, trace_id: 'x'.repeat(40) },
  }));
}

function genSecrets(n: number): Row[] {
  // Fixtures sintéticas: valores FAKE explícitos, nunca credenciais reais.
  return Array.from({ length: n }, (_, i) => ({
    key: `api_token_${i}`,
    value: 'FAKE_SECRET_FOR_BENCHMARK_ONLY_' + 'x'.repeat(40),
    description: `Token para serviço ${i}`,
    category: 'external_api',
    created_at: '2026-01-01T00:00:00Z',
    last_rotated: '2026-03-15T10:00:00Z',
    rotation_policy: 'quarterly',
    scopes: ['read', 'write'],
  }));
}

function genAgentHandoffItems(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    content: 'x'.repeat(400 + (i * 20)),
    summary: `Item ${i}: resumo curto`,
  }));
}

console.log('\n=== omni-token-economy benchmark ===\n');

{
  const before = genMemoryRows(20);
  const after = compactRecords(before, {
    redundantPairs: [['summary', 'content']],
    dropFields: ['source', 'created_at_brt', 'updated_at', 'updated_at_brt', 'extracted_facts'],
    timestampFields: ['created_at'],
    stripTagPrefixes: ['project:'],
  });
  bench('Memory search (20 items, omnimemory-like)', before, after);
}

{
  const before = genApiResponses(50);
  const after = compactRecords(before, {
    redundantPairs: [['name', 'title']],
    dropFields: ['internal_id', 'updated_at', '_metadata'],
    timestampFields: ['created_at'],
  });
  bench('Generic API response (50 items)', before, after);
}

{
  const before = genSecrets(10);
  const after = compactSecrets(before, {
    whitelist: ['key', 'description', 'category'],
  });
  bench('Secret list (10 items, whitelist metadata)', before, after);
}

{
  const before = genAgentHandoffItems(20);
  const result = compressContext(before, {
    maxTokens: 1500,
    keepFullFirst: 3,
    summaryMaxChars: 200,
  });
  bench('Agent handoff (20 items, adaptive)', before, result.items, result.compressed);
}

console.log('\nNotas:');
console.log('  - Números estimados via heurística de 3 chars/token.');
console.log('  - Com tokenizer real (tiktoken/claude-tokenizer) os valores ficam ±15%.');
console.log('  - Para telemetria por chamada use { telemetry: true } na sua app.');
console.log('');
