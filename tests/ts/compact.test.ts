import { describe, test, expect } from 'vitest';
import {
  compactRecord,
  compactRecords,
  compactRecordWithTelemetry,
  compactSecret,
  compactSecrets,
  compressContext,
  detectRedundancy,
  isRedundant,
  compactTimestamp,
  estimateTokens,
  estimateObjectTokens,
} from '../../src/ts/index.js';

describe('estimateTokens', () => {
  test('0 for empty input', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  test('ceil(len / 3)', () => {
    expect(estimateTokens('abc')).toBe(1);
    expect(estimateTokens('abcd')).toBe(2);
    expect(estimateTokens('a'.repeat(300))).toBe(100);
  });
});

describe('detectRedundancy / isRedundant', () => {
  test('identical strings → 1.0', () => {
    expect(detectRedundancy('hello world', 'hello world')).toBe(1);
  });

  test('short fully contained in long → 1.0', () => {
    expect(detectRedundancy('RTK analisado', 'RTK (Rust Token Killer) analisado em detalhe'))
      .toBe(1);
  });

  test('word overlap ratio', () => {
    const r = detectRedundancy('um dois três', 'um dois quatro');
    expect(r).toBeGreaterThan(0.6);
    expect(r).toBeLessThan(0.7);
  });

  test('no overlap → 0', () => {
    expect(detectRedundancy('alpha beta', 'gamma delta')).toBe(0);
  });

  test('isRedundant uses threshold', () => {
    expect(isRedundant('um dois', 'um dois três', 0.6)).toBe(true);
    expect(isRedundant('completamente diferente', 'outro texto', 0.6)).toBe(false);
  });
});

describe('compactTimestamp', () => {
  test('default minute precision trims to 16 chars', () => {
    expect(compactTimestamp('2026-04-20T20:59:17.178180+00:00'))
      .toBe('2026-04-20T20:59');
  });

  test('normalizes space to T', () => {
    expect(compactTimestamp('2026-04-20 20:59:17+00:00'))
      .toBe('2026-04-20T20:59');
  });

  test('honors precision', () => {
    expect(compactTimestamp('2026-04-20T20:59:17', 'day')).toBe('2026-04-20');
    expect(compactTimestamp('2026-04-20T20:59:17', 'hour')).toBe('2026-04-20T20');
    expect(compactTimestamp('2026-04-20T20:59:17', 'second')).toBe('2026-04-20T20:59:17');
  });

  test('null for empty input', () => {
    expect(compactTimestamp(null)).toBeNull();
    expect(compactTimestamp('')).toBeNull();
  });
});

describe('compactRecord', () => {
  test('drops redundant summary when content covers it', () => {
    const r = compactRecord({
      id: '1',
      summary: 'RTK analisado',
      content: 'RTK (Rust Token Killer) analisado em detalhes',
    }, {
      redundantPairs: [['summary', 'content']],
    });
    expect(r.summary).toBeUndefined();
    expect(r.content).toContain('RTK');
  });

  test('keeps summary when it adds info', () => {
    const r = compactRecord({
      summary: 'Previne injection',
      content: 'A função sanitiza input de usuário.',
    }, { redundantPairs: [['summary', 'content']] });
    expect(r.summary).toBe('Previne injection');
  });

  test('drops listed fields', () => {
    const r = compactRecord(
      { id: '1', internal_id: 'x', updated_at: '...' },
      { dropFields: ['internal_id', 'updated_at'] },
    );
    expect(r.internal_id).toBeUndefined();
    expect(r.updated_at).toBeUndefined();
    expect(r.id).toBe('1');
  });

  test('whitelist wins — drops everything else', () => {
    const r = compactRecord(
      { id: '1', a: 2, b: 3, c: 4 },
      { whitelistFields: ['id', 'a'] },
    );
    expect(Object.keys(r).sort()).toEqual(['a', 'id']);
  });

  test('truncates timestamps in listed fields', () => {
    const r = compactRecord(
      { created_at: '2026-04-20T20:59:17.178180+00:00' },
      { timestampFields: ['created_at'] },
    );
    expect(r.created_at).toBe('2026-04-20T20:59');
  });

  test('strips tag prefix redundancy', () => {
    const r = compactRecord(
      { tags: ['project:omniforge', 'category:arch', 'priority:high'] },
      { stripTagPrefixes: ['project:'] },
    );
    expect(r.tags).toEqual(['category:arch', 'priority:high']);
  });

  test('removes tags field when all tags were stripped', () => {
    const r = compactRecord(
      { tags: ['project:foo'] },
      { stripTagPrefixes: ['project:'] },
    );
    expect((r as Record<string, unknown>).tags).toBeUndefined();
  });

  test('does not mutate input', () => {
    const input = { id: '1', internal_id: 'x' };
    const r = compactRecord(input, { dropFields: ['internal_id'] });
    expect(input.internal_id).toBe('x');
    expect((r as Record<string, unknown>).internal_id).toBeUndefined();
  });
});

describe('compactRecords', () => {
  test('maps across a list', () => {
    const rs = compactRecords(
      [{ a: 1, b: 2 }, { a: 3, b: 4 }],
      { dropFields: ['b'] },
    );
    expect(rs).toEqual([{ a: 1 }, { a: 3 }]);
  });
});

describe('compressContext', () => {
  test('returns input unchanged when under budget', () => {
    const items = Array.from({ length: 3 }, (_, i) => ({
      content: 'short',
      summary: 's',
      id: i,
    }));
    const r = compressContext(items, { maxTokens: 1000, keepFullFirst: 5 });
    expect(r.compressed).toBe(false);
    expect(r.items.length).toBe(3);
  });

  test('compresses beyond keepFullFirst when over budget', () => {
    const longContent = 'x'.repeat(3000);
    const items = Array.from({ length: 10 }, (_, i) => ({
      content: longContent,
      summary: `summary ${i}`,
      id: i,
    }));
    const r = compressContext(items, {
      maxTokens: 1000,
      keepFullFirst: 3,
    });
    expect(r.compressed).toBe(true);
    expect((r.items[0] as Record<string, unknown>)._compressed).toBeUndefined();
    expect((r.items[2] as Record<string, unknown>)._compressed).toBeUndefined();
    expect((r.items[3] as Record<string, unknown>)._compressed).toBe(true);
    expect((r.items[3] as Record<string, unknown>).content).toBe('summary 3');
  });

  test('emits telemetry when asked', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      content: 'x'.repeat(3000),
      summary: `s${i}`,
      id: i,
    }));
    const r = compressContext(items, {
      maxTokens: 1000,
      keepFullFirst: 3,
      telemetry: true,
    });
    expect(r.metrics).toBeDefined();
    expect(r.metrics!.reductionPercent).toBeGreaterThan(30);
  });
});

describe('compactSecret', () => {
  test('returns only whitelisted fields — never value', () => {
    // Fixture sanitized — never use real tokens in tests. See CLAUDE.md #5.
    const secret = {
      key: 'example_api_token',
      value: 'FAKE_TEST_TOKEN_DO_NOT_USE',
      description: 'Exemplo sintético para teste',
      category: 'api',
      created_at: '2026-01-01',
    };
    const safe = compactSecret(secret, {
      whitelist: ['key', 'description', 'category'],
    });
    expect(Object.keys(safe).sort()).toEqual(['category', 'description', 'key']);
    expect((safe as Record<string, unknown>).value).toBeUndefined();
  });

  test('compactSecrets on a list', () => {
    const rs = compactSecrets(
      [{ key: 'a', value: 'FAKE_A' }, { key: 'b', value: 'FAKE_B' }],
      { whitelist: ['key'] },
    );
    expect(rs).toEqual([{ key: 'a' }, { key: 'b' }]);
  });
});

describe('compactRecordWithTelemetry', () => {
  test('returns value and metrics', () => {
    const { value, metrics } = compactRecordWithTelemetry(
      {
        id: '1',
        summary: 'dupe',
        content: 'dupe completa com muito texto redundante',
        extra: 'remover',
      },
      {
        redundantPairs: [['summary', 'content']],
        dropFields: ['extra'],
      },
    );
    expect((value as Record<string, unknown>).summary).toBeUndefined();
    expect((value as Record<string, unknown>).extra).toBeUndefined();
    expect(metrics.tokensBefore).toBeGreaterThan(metrics.tokensAfter);
    expect(metrics.reductionPercent).toBeGreaterThan(0);
  });
});

describe('estimateObjectTokens', () => {
  test('estimates JSON serialization size', () => {
    const obj = { a: 'hello', b: 'world' };
    const n = estimateObjectTokens(obj);
    expect(n).toBeGreaterThan(0);
  });
});
