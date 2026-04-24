# omni-token-economy

> Biblioteca universal de compactação de tokens para aplicações LLM. **Zero lock-in de backend.**

[![CI](https://github.com/jessefreitas/omni-token-economy/actions/workflows/ci.yml/badge.svg)](https://github.com/jessefreitas/omni-token-economy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Por que existe

Sessões longas de Claude Code / aplicações LLM desperdiçam tokens com **redundância semântica**: `summary` que repete `content`, timestamps em microssegundo quando minuto basta, tags `project:xxx` quando o campo `project` já existe, metadata de IDs internos que o modelo nunca usa.

Esta biblioteca aplica 5 técnicas comprovadas para remover esse ruído **sem perder significado**:

| Técnica | Ganho típico |
|---|---|
| Redundância campo-a-campo (overlap ≥60% entre summary e content) | 15-25% |
| Precisão temporal calibrada ao uso (microssegundo → minuto) | 5-10% |
| Whitelist de metadata para dados sensíveis (secrets) | 40-70% |
| Adaptive compression top-N (primeiros K verbatim, resto vira summary) | 50-85% |
| Drop de campos redundantes por schema | 20-35% |

**Combinado:** 25-55% de redução média em chamadas que manipulam dados estruturados.

## Instalação

```bash
# TypeScript / Node.js
npm install @omniforge/omni-token-economy

# Python
pip install omni-token-economy
```

## Uso rápido

### TypeScript

```typescript
import { compactRecord, compressContext, compactSecret, estimateTokens } from '@omniforge/omni-token-economy';

// Trim de resposta de API antes de passar para o agente
const slim = compactRecord(apiResponse, {
  redundantPairs: [['summary', 'content'], ['title', 'name']],
  dropFields: ['internal_id', 'updated_at_ms'],
  timestampFields: ['created_at'],
  timestampPrecision: 'minute',
});

// Comprimir lista grande adaptativamente
const { items, compressed, metrics } = compressContext(searchResults, {
  maxTokens: 3000,
  keepFullFirst: 5,
  summaryField: 'description',
  contentField: 'body',
  telemetry: true,
});
console.log(`Economia: ${metrics.reductionPercent}%`);

// Metadata de secret — nunca o valor
const safeView = compactSecret(credential, {
  whitelist: ['key', 'description', 'category', 'rotated_at'],
});

// Estimar tokens antes de enviar
const tokens = estimateTokens(longText); // ≈ chars / 3
```

### Python

```python
from omni_token_economy import compact_record, compress_context, compact_secret, estimate_tokens

slim = compact_record(api_response, rules={
    "redundant_pairs": [("summary", "content"), ("title", "name")],
    "drop_fields": ["internal_id", "updated_at_ms"],
    "timestamp_fields": ["created_at"],
    "timestamp_precision": "minute",
})

result = compress_context(
    search_results,
    max_tokens=3000,
    keep_full_first=5,
    summary_field="description",
    content_field="body",
    telemetry=True,
)
print(f"Economia: {result.metrics.reduction_percent}%")
```

## API

Ver [docs/API.md](docs/API.md) para referência completa.

| Função | Para quê |
|---|---|
| `compactRecord(obj, rules)` | Remove redundância de 1 objeto dict/record |
| `compactRecords(list, rules)` | Aplica em lista |
| `compressContext(items, opts)` | Compressão adaptativa top-N + summary |
| `compactSecret(obj, opts)` | Whitelist de metadata para dado sensível |
| `estimateTokens(text)` | Estimativa rápida: chars / 3 |
| `detectRedundancy(a, b)` | Overlap de palavras (0.0-1.0) |
| `isRedundant(short, long, threshold)` | True se `short` é coberto por `long` |

## Telemetria

Toda função aceita `{ telemetry: true }` e retorna métricas de economia:

```typescript
{
  bytesBefore: 1240,
  bytesAfter: 582,
  tokensBefore: 413,
  tokensAfter: 194,
  tokensSaved: 219,
  reductionPercent: 53.0
}
```

Com agregação em dashboard, dá para medir ganho real por dev/time/mês.
Ver [`benchmarks/`](benchmarks/) para rodar em datasets próprios.

## Compliance

Segue baseline de ISO 27001 + cyber OmniForge — ver [`docs/compliance.md`](docs/compliance.md).

Destaques:
- **A.8.12** — `compactSecret` nunca retorna valor de secret (só metadata), prevenindo vazamento acidental.
- **A.8.10** — redução de informação desnecessária é uma das funções primárias.
- Zero log de input com PII.

## Licença

[MIT](LICENSE).
