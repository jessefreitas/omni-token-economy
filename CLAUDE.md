# omni-token-economy — instruções para Claude

Biblioteca utilitária universal de compactação de tokens para aplicações LLM. Projeto OmniForge, segue o padrão do marketplace [`skills_transformers`](https://github.com/jessefreitas/skills_transformers).

## Escopo e filosofia

- **Universal** — zero acoplamento a MCP, backend ou schema específico. Aceita qualquer dict/objeto + regras declarativas.
- **Paridade TS ↔ Python** — toda função da API pública existe nas duas linguagens com assinatura equivalente.
- **Telemetria embutida** — cada função aceita `telemetry: true` e retorna métricas de economia real (bytes, tokens estimados, %).
- **Zero efeito colateral** — funções puras. Input in, output out. Sem mutação.

## Regra cardinal

1. Toda nova função em TS **precisa** de contraparte em Python (e vice-versa).
2. Testes espelham a API dos dois lados — se um teste passa em TS mas falha em Py, bug de paridade.
3. Nenhum PR merged sem benchmark atualizado mostrando impacto em ≥1 dataset real.
4. Classe de dados manipulados: interna. Se alguma função for manipular dado sensível (ex: secret), vai pela API `compactSecret` com whitelist obrigatória.
5. **Fixtures de teste jamais contêm credencial/token real.** Sempre usar valores obviamente fake (`FAKE_TEST_TOKEN_DO_NOT_USE`, `sk-fake-xxx`, etc.).

## Stack

- **TypeScript:** Node.js 24+, ESM only, vitest para testes.
- **Python:** 3.11+, pytest, pyproject.toml / uv.
- **Zero runtime deps** — lib deve ser instalável em qualquer ambiente sem puxar lixo.

## Estrutura

```
omni-token-economy/
├── src/
│   ├── ts/              # TypeScript
│   └── py/omni_token_economy/   # Python package
├── tests/
│   ├── ts/              # vitest
│   └── py/              # pytest
│   └── fixtures/        # datasets reais (sanitizados)
├── benchmarks/          # scripts de medição com datasets
├── docs/
│   ├── API.md           # referência da API pública (TS+Py)
│   ├── compliance.md    # adesão ISO/cyber
│   └── benchmarks.md    # resultados publicados
└── .github/workflows/   # CI (lint, test TS, test Py, benchmark)
```

## Compliance

Este projeto segue [`shared/compliance-baseline.md`](https://github.com/jessefreitas/skills_transformers/blob/main/shared/compliance-baseline.md) do marketplace.

Controles ISO especialmente relevantes:
- **A.8.10** (exclusão de informação desnecessária) — função primária da lib.
- **A.8.12** (prevenção de vazamento) — `compactSecret` evita exposição de valor; fixtures de teste proibidas de conter secret real.
- **A.8.28** (codificação segura) — funções puras, sem eval, sem deserialização insegura.
- **A.8.29** (testes de segurança) — CI inclui gitleaks e CodeQL.

## Estilo

- PT-BR nas docs de usuário (README, docs/).
- Inglês técnico no código (nomes, comentários, mensagens de erro).
- Conventional Commits.
- Sem emoji em código ou commit — docs podem usar com moderação.
