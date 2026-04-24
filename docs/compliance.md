# Compliance — omni-token-economy

Adesão ao baseline [`skills_transformers/shared/compliance-baseline.md`](https://github.com/jessefreitas/skills_transformers/blob/main/shared/compliance-baseline.md).

## 1. Classificação de dados manipulados

| Dado | Classe | Regra |
|---|---|---|
| Entradas (dicts/objetos que o usuário passa) | depende do contexto de quem chama | a lib não persiste, só transforma in-memory |
| Output compactado | mesma classe do input | paridade preservada |
| Telemetria emitida (bytes, tokens, %) | pública | estatística agregada, sem conteúdo |
| Valor de secret em `compact_secret` | restrita — **nunca sai no output** | A.8.12 enforcement |

## 2. Controles ISO 27001 Annex A

- [x] **A.8.10** — Exclusão de informação desnecessária. Função primária da lib.
- [x] **A.8.11** — Mascaramento. `compact_secret` whitelist-only. Telemetria nunca inclui conteúdo.
- [x] **A.8.12** — Prevenção de vazamento. Impossível (by design) `compact_secret` retornar o valor.
- [x] **A.8.25** — Ciclo de desenvolvimento seguro. SDD + TDD + paridade TS/Py com testes.
- [x] **A.8.28** — Codificação segura. Funções puras, sem `eval`, sem deserialização insegura.
- [x] **A.8.29** — Testes de segurança. CI com gitleaks + CodeQL.

## 3. Cyber checklist

- [x] Zero runtime dependency (sem supply chain risk indireto).
- [x] Input validation: todas as funções checam tipos antes de usar.
- [x] Sem dependência transitiva de crypto/auth — lib é puramente transformacional.
- [x] CI: gitleaks + CodeQL + lint + test matrix (Python 3.11/3.12/3.13).
- [x] Lockfile commitado (`package-lock.json`) para reprodutibilidade A.8.8.
- [x] Nenhum `console.log` ou `print` de dados em produção.
- [x] **Fixtures de teste jamais contêm credencial real** — sempre valores obviamente fake (`FAKE_TEST_TOKEN_DO_NOT_USE`).

## 4. O que a lib **nunca** faz

- Rede (nada de `fetch`, `requests`, `http`).
- Disco (nada de `fs.readFile`, `open()`).
- Persistência.
- Log de conteúdo do usuário.
- Deserialização de dados externos (só recebe objetos Python/JS já parseados).

## 5. Regras para contribuidor

PR só é aceito se:

- [ ] Testes de paridade TS↔Py passam (mesma assinatura, mesmo comportamento).
- [ ] Nenhuma dependência runtime adicionada (dev-only OK).
- [ ] Nenhum `console.log`/`print` introduzido.
- [ ] Nenhum valor parecido com secret real em fixture (CI gitleaks verifica).
- [ ] Benchmark executado, resultado anexado ao PR.

## 6. Auditoria

- Última revisão: 2026-04-24.
- Próxima revisão: trimestral.
- Responsável: @jessefreitas.
