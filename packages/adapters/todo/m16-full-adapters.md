# M16 — Full Adapters

> Источник: `packages/adapters/TODO.md`

> **Задач:** 115 | **Проверка:** 9 языков AST, все adapter features

> **Результат milestone:** Готовы advanced adapter-возможности для enterprise и масштабной аналитики.

## AST v0.5.0 — Advanced Graph Features

> Cluster computation and graph diff. ~60K tokens.

> **Результат версии:** Завершена версия «AST v0.5.0 — Advanced Graph Features» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-GRAPH-005 | Реализовать cluster computation | DONE | `core` расширен портом `ICodeGraphClusteringService` (вход/выход + DI token), а `adapters` добавил `AstCodeGraphClusteringService` с детерминированным Louvain local-optimization, typed error-контрактом, file subset filtering и стабильным `communities/modularity` output. Покрытие включает `core` contract/tokens tests и `adapters` happy/failure-path tests для clustering + DI module wiring. | Реализация: Louvain communities. Модуль detection. Готово, если: для AST-GRAPH-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-GRAPH-006 | Реализовать graph diff service | DONE | `core` расширен портом `ICodeGraphDiffService` (added/removed/changed nodes + edge diff) и новым analysis token. В `adapters` добавлен `AstCodeGraphDiffService` с детерминированным сравнением snapshots, file-path filtering, metadata-aware changed-node detection и typed error для невалидных filters. Добавлены contract/DI/happy/failure tests и обновлён module wiring. | Реализация: Compare graphs between commits. Detect added/removed nodes. Готово, если: graph diff service корректно определяет добавленные/удалённые/изменённые узлы между ревизиями и возвращает стабильный результат при повторном запуске; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.6.0 — Python & Go Parsers

> Additional language parsers. ~80K tokens.

> **Результат версии:** Завершена версия «AST v0.6.0 — Python & Go Parsers» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-LANG-001 | Реализовать python parser | TODO | Не начато | Реализация:.py. Extracts: classes, functions, imports. Готово, если: python parser извлекает сущности/импорты на реальных репозиториях без критичных parse-fail, fallback для синтаксических ошибок покрыт тестами; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-LANG-002 | Реализовать go parser | TODO | Не начато | Реализация:.go. Extracts: types, functions, imports. Готово, если: для AST-LANG-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-LANG-003 | Реализовать java parser | TODO | Не начато | Реализация:.java. Extracts: classes, interfaces, methods. Готово, если: java parser корректно выделяет classes/interfaces/methods и учитывает nested declarations, unsupported constructs не роняют весь файл; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.7.0 — Additional Language Parsers

> More language support. ~100K tokens.

> **Результат версии:** Завершена версия «AST v0.7.0 — Additional Language Parsers» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-LANG-004 | Реализовать rust parser | TODO | Не начато | Реализация:.rs. Extracts: structs, traits, impls, functions. Готово, если: для AST-LANG-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-LANG-005 | Реализовать pHP parser | TODO | Не начато | Реализация:.php. Extracts: classes, functions, traits. Готово, если: для AST-LANG-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-LANG-006 | Реализовать c# parser | TODO | Не начато | Реализация:.cs. Extracts: classes, interfaces, methods. Готово, если: для AST-LANG-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-LANG-007 | Реализовать ruby parser | TODO | Не начато | Реализация:.rb. Extracts: classes, modules, methods. Готово, если: для AST-LANG-007 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-LANG-008 | Реализовать kotlin parser | TODO | Не начато | Реализация:.kt. Extracts: classes, objects, functions. Готово, если: для AST-LANG-008 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.8.0 — Advanced Analysis

> Advanced code analysis features. ~80K tokens.

> **Результат версии:** Завершена версия «AST v0.8.0 — Advanced Analysis» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-ADV-001 | Реализовать advanced code analysis | TODO | Не начато | Реализация: Complex pattern detection. Готово, если: для AST-ADV-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-ADV-002 | Реализовать aST-based deduplication | TODO | Не начато | Реализация: Detect duplicate code via AST similarity. Готово, если: для AST-ADV-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-ADV-003 | Реализовать semantic code understanding | TODO | Не начато | Реализация: Understand code semantics beyond syntax. Готово, если: для AST-ADV-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-ADV-004 | Реализовать cross-file reference resolution | TODO | Не начато | Реализация: Resolve references across files. Готово, если: для AST-ADV-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.9.0 — Cross-File Analysis Core

> Core cross-file analysis features. ~100K tokens.

> **Результат версии:** Завершена версия «AST v0.9.0 — Cross-File Analysis Core» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-CFA-001 | Реализовать crossFileAnalyzer base class | TODO | Не начато | Реализация: Base class for cross-file analysis. Готово, если: для AST-CFA-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-CFA-002 | Реализовать import/Export graph builder | TODO | Не начато | Реализация: Build import/export dependency graph. Готово, если: для AST-CFA-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-CFA-003 | Реализовать dependency chain resolver | TODO | Не начато | Реализация: Resolve full dependency chains. Готово, если: для AST-CFA-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-CFA-004 | Реализовать breaking change detector | TODO | Не начато | Реализация: Detect breaking API changes. Готово, если: для AST-CFA-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-CFA-008 | Реализовать circular dependency detector | TODO | Не начато | Реализация: Detect circular dependencies. Готово, если: для AST-CFA-008 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.10.0 — Cross-File Analysis Extended

> Extended cross-file analysis features. ~100K tokens.

> **Результат версии:** Завершена версия «AST v0.10.0 — Cross-File Analysis Extended» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-CFA-005 | Реализовать interface contract validator | TODO | Не начато | Реализация: Validate interface implementations. Готово, если: для AST-CFA-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-CFA-006 | Реализовать type flow analyzer | TODO | Не начато | Реализация: Analyze type flow across files. Готово, если: для AST-CFA-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-CFA-007 | Реализовать shared state detector | TODO | Не начато | Реализация: Detect shared mutable state. Готово, если: для AST-CFA-007 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-CFA-009 | Реализовать impact radius calculator | TODO | Не начато | Реализация: Calculate impact radius of changes. Готово, если: для AST-CFA-009 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-CFA-010 | Реализовать cross-file issue aggregator | TODO | Не начато | Реализация: Aggregate issues across files. Готово, если: для AST-CFA-010 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-CFA-011 | Реализовать monorepo package boundary checker | TODO | Не начато | Реализация: Check package boundaries in monorepos. Готово, если: для AST-CFA-011 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-CFA-012 | Реализовать aPI surface change detector | TODO | Не начато | Реализация: Detect public API changes. Готово, если: для AST-CFA-012 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.11.0 — Worker Infrastructure

> Parallel processing and memory management. ~90K tokens.

> **Результат версии:** Завершена версия «AST v0.11.0 — Worker Infrastructure» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-WORK-001 | Реализовать piscinaWorkerPool | TODO (P0) | Не начато | Реализация: CPU-1 workers. Max queue 1000. 2 concurrent tasks/worker. Готово, если: для AST-WORK-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-WORK-002 | Реализовать batchProcessingService | TODO (P0) | Не начато | Реализация: Batch size: cpuCount \* 2 for <1000 files. Adaptive sizing. Готово, если: для AST-WORK-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-WORK-003 | Реализовать memoryPressureManager | TODO (P1) | Не начато | Реализация: Pause at 85% memory. Resume when below threshold. Готово, если: для AST-WORK-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-WORK-004 | Реализовать воркерTaskExecutor | TODO (P0) | Не начато | Реализация: Execute in worker thread. Возвращает parsed FileAnalysis. Готово, если: для AST-WORK-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-WORK-005 | Реализовать streamingMetricsCollector | TODO (P2) | Не начато | Реализация: Track filesProcessed, avgProcessingTime. Log every 5 batches. Готово, если: для AST-WORK-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-WORK-006 | Реализовать garbageCollectionTrigger | TODO (P2) | Не начато | Реализация: Trigger GC at 70% memory. 10s interval check. Готово, если: для AST-WORK-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.12.0 — Import Resolution

> Language-specific import path resolution. ~80K tokens.

> **Результат версии:** Завершена версия «AST v0.12.0 — Import Resolution» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-IMPORT-001 | Реализовать baseImportResolver | TODO (P0) | Не начато | Реализация: Abstract base class for import resolvers. Готово, если: для AST-IMPORT-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-IMPORT-002 | Реализовать typeScriptImportResolver | TODO (P0) | Не начато | Реализация: Resolve TS/JS imports (tsconfig, package.json). Готово, если: для AST-IMPORT-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-IMPORT-003 | Реализовать pythonImportResolver | TODO (P1) | Не начато | Реализация: Resolve Python imports (**init**.py, PYTHONPATH). Готово, если: для AST-IMPORT-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-IMPORT-004 | Реализовать goImportResolver | TODO (P1) | Не начато | Реализация: Resolve Go imports (go.mod). Готово, если: для AST-IMPORT-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-IMPORT-005 | Реализовать javaImportResolver | TODO (P2) | Не начато | Реализация: Resolve Java imports (classpath, pom.xml). Готово, если: для AST-IMPORT-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-IMPORT-006 | Реализовать importResolutionCache | TODO (P1) | Не начато | Реализация: Cache resolved import paths. Готово, если: для AST-IMPORT-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.13.0 — Function Analysis

> Advanced function analysis with LLM. ~70K tokens.

> **Результат версии:** Завершена версия «AST v0.13.0 — Function Analysis» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-FUNC-001 | Реализовать functionSimilarityService | TODO (P1) | Не начато | Реализация: Jaccard > 0.5 threshold. LLM validation. Возвращает isSimilar + explanation. Готово, если: для AST-FUNC-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-FUNC-002 | Реализовать functionHashGenerator | TODO (P0) | Не начато | Реализация: FunctionHash (normalized AST), signatureHash (SHA256 of params+return). Готово, если: для AST-FUNC-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-FUNC-003 | Реализовать functionCallChainBuilder | TODO (P1) | Не начато | Реализация: Builds chain: caller → callee → callee. Resolves through imports. Готово, если: для AST-FUNC-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-FUNC-004 | Реализовать functionBodyExtractor | TODO (P0) | Не начато | Реализация: Extracts fullText from startLine to endLine. Handles nested functions. Готово, если: для AST-FUNC-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.14.0 — Multi-Repo AST Service

> Horizontally scalable AST analysis. ~100K tokens.

> **Результат версии:** Завершена версия «AST v0.14.0 — Multi-Repo AST Service» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-SVC-001 | Реализовать aST Service architecture design | TODO (P1) | Не начато | Реализация: Design scalable AST service. Готово, если: для AST-SVC-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SVC-002 | Реализовать gRPC/Protobuf definitions | TODO (P1) | Не начато | Реализация: Define gRPC service and messages. Готово, если: для AST-SVC-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SVC-003 | Реализовать aST Service server implementation | TODO (P1) | Не начато | Реализация: Implement gRPC server. Готово, если: для AST-SVC-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SVC-004 | Реализовать aST Service client library | TODO (P1) | Не начато | Реализация: Client library for AST service. Готово, если: для AST-SVC-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SVC-005 | Реализовать service health monitoring | TODO (P2) | Не начато | Реализация: Health checks and monitoring. Готово, если: для AST-SVC-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SVC-006 | Реализовать horizontal scaling support | TODO (P2) | Не начато | Реализация: Support for horizontal scaling. Готово, если: для AST-SVC-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SVC-007 | Реализовать aST result caching layer | TODO (P2) | Не начато | Реализация: Cache AST results. Готово, если: для AST-SVC-007 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SVC-008 | Реализовать multi-repo graph federation | TODO (P2) | Не начато | Реализация: Federate graphs across repos. Готово, если: для AST-SVC-008 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.15.0 — File Metrics for CodeCity

> Per-file метрики из AST: LOC, cyclomatic complexity, churn. Реализация IFileMetricsProvider порта из core. ~80K

> **Результат версии:** Завершена версия «AST v0.15.0 — File Metrics for CodeCity» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> tokens.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-METRIC-001 | Реализовать lOC calculator | TODO (P1) | Не начато | Реализация: Lines of code per file. Exclude blank lines and comments. Supports all parsed languages. Возвращает `{filePath, loc}`. Готово, если: для AST-METRIC-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-METRIC-002 | Реализовать cyclomatic complexity | TODO (P1) | Не начато | Реализация: Calculate McCabe complexity per file from AST control flow. Возвращает `{filePath, complexity}`. Готово, если: для AST-METRIC-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-METRIC-003 | Реализовать churn calculator | TODO (P1) | Не начато | Реализация: Git-based churn: number of commits touching file in last N days. Uses git log. Возвращает `{filePath, churn}`. Готово, если: для AST-METRIC-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-METRIC-004 | Реализовать fileMetricsProvider impl | TODO (P1) | Не начато | Реализация: реализует `IFileMetricsProvider` from core. Aggregates LOC + complexity + churn per file. Batch processing. Готово, если: для AST-METRIC-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-METRIC-005 | Реализовать metrics caching | TODO (P2) | Не начато | Реализация: Cache computed metrics per repo+commit. Invalidate on new commits. TTL-based. Готово, если: для AST-METRIC-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.16.0 — Full Репозиторий Scan Mode

> Полное сканирование репозитория: все файлы, построение графа, метрики. ~60K tokens.

> **Результат версии:** Завершена версия «AST v0.16.0 — Full Repository Scan Mode» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-SCAN-001 | Реализовать fullRepoScanner | TODO (P1) | Не начато | Реализация: Scan all files in repo. Language detection. Skip binary/vendor. Progress callback. Возвращает IScanResult. Готово, если: для AST-SCAN-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SCAN-002 | Реализовать incrementalDiffScanner | TODO (P1) | Не начато | Реализация: Scan only changed files since last commit/ref. Reuse cached ASTs. Возвращает changed nodes only. Готово, если: для AST-SCAN-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SCAN-003 | Реализовать scanResultAggregator | TODO (P1) | Не начато | Реализация: Aggregate scan results: total files, languages, metrics summary. Возвращает IScanSummary. Готово, если: для AST-SCAN-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SCAN-004 | Реализовать parallelFileParser | TODO (P1) | Не начато | Реализация: Parse files in parallel (worker threads). Configurable concurrency. Error isolation per file. Готово, если: для AST-SCAN-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-SCAN-005 | Реализовать scanProgressReporter | TODO (P2) | Не начато | Реализация: Report scan progress: files parsed / total, current file, ETA. реализует IScanProgressCallback. Готово, если: для AST-SCAN-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.17.0 — Ownership & Churn Metrics

> Метрики ownership и churn из AST + git данных. ~40K tokens.

> **Результат версии:** Завершена версия «AST v0.17.0 — Ownership & Churn Metrics» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-OWN-001 | Реализовать ownershipCalculator | TODO (P1) | Не начато | Реализация: Calculate file ownership from git blame data. Primary + secondary owners. Threshold configurable. Готово, если: для AST-OWN-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-OWN-002 | Реализовать churnTrendCalculator | TODO (P1) | Не начато | Реализация: Calculate churn trends: rolling average over configurable windows. Detect acceleration/deceleration. Готово, если: для AST-OWN-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-OWN-003 | Реализовать complexityChurnCorrelator | TODO (P1) | Не начато | Реализация: Correlate complexity changes with churn. Возвращает scatter data. Identifies high-churn-high-complexity. Готово, если: для AST-OWN-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.18.0 — Blueprint Structural Validation

> Валидация архитектурного blueprint через AST анализ. ~50K tokens.

> **Результат версии:** Завершена версия «AST v0.18.0 — Blueprint Structural Validation» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-BLUE-001 | Реализовать blueprintParser | TODO (P1) | Не начато | Реализация: Parse architecture blueprint YAML. Validate schema. Возвращает IBlueprintDefinition. Готово, если: для AST-BLUE-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-BLUE-002 | Реализовать importViolationDetector | TODO (P1) | Не начато | Реализация: Detect import violations against blueprint rules. Layer → layer allowed imports. Возвращает violations. Готово, если: для AST-BLUE-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-BLUE-003 | Реализовать модульBoundaryValidator | TODO (P1) | Не начато | Реализация: Validate module boundaries: no cross-boundary internal imports. Возвращает boundary violations. Готово, если: для AST-BLUE-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-BLUE-004 | Реализовать driftScoreCalculator | TODO (P1) | Не начато | Реализация: Calculate drift score: violations / total imports. Breakdown by module. Trend over commits. Готово, если: для AST-BLUE-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Git v0.5.1 — Batch Review & Comment Tracking

> Batch-отправка комментариев через Review API и управление существующими комментариями при повторном review.

> **Результат версии:** Завершена версия «Git v0.5.1 — Batch Review & Comment Tracking» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> Prerequisite: core v0.63.1 (IBatchReviewRequest, ICommentTracker порты).

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| GIT-022 | Реализовать GitHubProvider.createReview() | TODO | Не начато | Реализация: Нативный batch через `pulls.createReview`. Fetch comments по `pull_request_review_id`. ACL: `toBatchReviewComments`, `reviewCommentToCommentDTO`. Готово, если: для GIT-022 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-023 | Реализовать gitLabProvider.createReview() | TODO | Не начато | Реализация: Sequential fallback: body → `MergeRequestNotes.create`, comments → `postInlineComment` поштучно. Guard на `lastMergeRequestIid`. Готово, если: для GIT-023 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-024 | Реализовать azureDevOps/Bitbucket.createReview() | TODO | Не начато | Реализация: Sequential fallback: body → `postComment`, comments → `postInlineComment`. LazyProvider overrides для Azure DevOps. Готово, если: для GIT-024 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-025 | Реализовать deleteComment() для всех провайдеров | TODO | Не начато | Реализация: GitHub: `pulls.deleteReviewComment`. GitLab: `MergeRequestNotes.remove`. Azure: `gitApi.deleteComment` (composite ID). Bitbucket: `deleteComment`. Готово, если: для GIT-025 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-026 | Реализовать gitHub updateComment review-first | TODO | Не начато | Реализация: Сначала `pulls.updateReviewComment`, при 404 → fallback на `issues.updateComment`. ACL: `reviewCommentToCommentDTO`. Готово, если: для GIT-026 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Git v0.6.0 — Ownership & Knowledge Provider

> Ownership данные для Knowledge Map и Bus Factor. ~40K tokens.

> **Результат версии:** Завершена версия «Git v0.6.0 — Ownership & Knowledge Provider» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| GIT-019 | Реализовать getFileOwnership | TODO | Не начато | Реализация: GitOwnershipProvider реализует IOwnershipProvider. getFileOwnership: commit history + blame → contributors, primaryOwner, busFactor. getContributors: maps getContributorStats. 26 тестов, 100% coverage. Готово, если: для GIT-019 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-020 | Реализовать getContributorGraph | TODO | Не начато | Реализация: Покрыто GIT-019: GetContributorGraphUseCase строит граф из getFileOwnership() + getContributors(), оба реализованы в GitOwnershipProvider. Готово, если: для GIT-020 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-021 | Реализовать getOwnershipTimeline | TODO | Не начато | Реализация: BuildOwnershipTimeline pure function. GitOwnershipProvider.getOwnershipTimeline(). Running total по коммитам, handoff detection, periods. IOwnershipTimeline DTO в core. 40 тестов, 100% coverage. Готово, если: для GIT-021 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## LLM v0.5.0 — Cerebras + Novita

> Additional inference providers. ~40K tokens.

> **Результат версии:** Завершена версия «LLM v0.5.0 — Cerebras + Novita» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| LLM-010 | Реализовать cerebrasProvider | TODO | Не начато | Реализация: Cerebras inference API. Готово, если: для LLM-010 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-011 | Реализовать novitaProvider | TODO | Не начато | Реализация: Novita AI provider. Готово, если: для LLM-011 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## LLM v0.6.0 — LangChain Интеграция

> LangChain adapter and tooling. ~100K tokens.

> **Результат версии:** Завершена версия «LLM v0.6.0 — LangChain Integration» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| LLM-012 | Реализовать langChainAdapter | TODO | Не начато | Реализация: Adapter for LangChain models. Готово, если: для LLM-012 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-013 | Реализовать langSmithTracer | TODO | Не начато | Реализация: LangSmith tracing/debugging. Готово, если: для LLM-013 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-014 | Реализовать promptTemplateManager | TODO | Не начато | Реализация: LangChain prompt templates. Готово, если: для LLM-014 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-015 | Реализовать chainBuilder | TODO | Не начато | Реализация: Build LLM chains for review. Готово, если: для LLM-015 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-016 | Реализовать callbackHandler | TODO | Не начато | Реализация: LangChain callback integration. Готово, если: для LLM-016 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## LLM v0.7.0 — Наблюдаемость

> LLM call tracing and logging. ~50K tokens.

> **Результат версии:** Завершена версия «LLM v0.7.0 — Observability» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| LLM-017 | Реализовать langSmithTracingService | TODO | Не начато | Реализация: LangSmith tracing integration. Готово, если: для LLM-017 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-018 | Реализовать LLMCallLogger | TODO | Не начато | Реализация: Structured LLM call logging. Готово, если: для LLM-018 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## LLM v0.8.0 — Prediction & Explanation Prompts

> LLM промпты для предсказаний, объяснений и генерации отчётов. ~40K tokens.

> **Результат версии:** Завершена версия «LLM v0.8.0 — Prediction & Explanation Prompts» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| LLM-019 | Реализовать predictionExplainPrompt | TODO | Не начато | Реализация: Prompt template: explain statistical prediction in natural language. Input: metrics, trends. Output: narrative. Готово, если: для LLM-019 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-020 | Реализовать onboardingSummaryPrompt | TODO | Не начато | Реализация: Prompt template: generate project overview from scan data. Input: tech stack, architecture, metrics. Output: summary. Готово, если: для LLM-020 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-021 | Реализовать refactoringAdvicePrompt | TODO | Не начато | Реализация: Prompt template: suggest refactoring approach. Input: code metrics, coupling data. Output: strategy + rationale. Готово, если: для LLM-021 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-022 | Реализовать executiveReportPrompt | TODO | Не начато | Реализация: Prompt template: generate executive summary. Input: repo state, trends, highlights. Output: narrative report. Готово, если: для LLM-022 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Context v0.3.0 — Monitoring + Observability Providers

> Datadog, Bugsnag, PostHog. ~80K tokens.

> **Результат версии:** Завершена версия «Context v0.3.0 — Monitoring + Observability Providers» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CTX-006 | Реализовать datadogProvider | TODO (P2) | Не начато | Реализация: Интеграция через REST API. Alerts, logs for affected code. Готово, если: для CTX-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| CTX-007 | Реализовать bugsnagProvider | TODO (P2) | Не начато | Реализация: Интеграция через REST API. Error context, breadcrumbs. Готово, если: для CTX-007 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| CTX-008 | Реализовать postHogProvider | TODO (P2) | Не начато | Реализация: Интеграция через REST API. Feature flag status, rollout %. Готово, если: для CTX-008 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Context v0.4.0 — Additional Providers + OpenAPI

> Trello, Notion, Cloudflare, OpenAPI schema. ~100K tokens.

> **Результат версии:** Завершена версия «Context v0.4.0 — Additional Providers + OpenAPI» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CTX-009 | Реализовать trelloProvider | TODO (P2) | Не начато | Реализация: Trello API integration. Готово, если: для CTX-009 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| CTX-010 | Реализовать notionProvider | TODO (P3) | Не начато | Реализация: Notion API integration. Готово, если: для CTX-010 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| CTX-011 | Реализовать cloudflareProvider | TODO (P3) | Не начато | Реализация: Cloudflare API integration. Готово, если: для CTX-011 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| CTX-012 | Реализовать openAPISchemaProvider | TODO (P2) | Не начато | Реализация: OpenAPI/Swagger spec provider. Готово, если: для CTX-012 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| CTX-013 | Реализовать openAPIParser | TODO (P2) | Не начато | Реализация: Parse OpenAPI/Swagger specs. Готово, если: для CTX-013 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| CTX-014 | Реализовать aPISchemaContextBuilder | TODO (P2) | Не начато | Реализация: Build context from API schemas. Готово, если: для CTX-014 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Notifications v0.4.0 — Report Delivery

> Доставка сгенерированных отчётов через уведомления. ~30K tokens.

> **Результат версии:** Завершена версия «Notifications v0.4.0 — Report Delivery» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| NOTIF-006 | Реализовать reportDeliveryService | TODO | Не начато | Реализация: Deliver generated reports via configured channels (Slack/Discord/email). Attachment or link. Готово, если: для NOTIF-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| NOTIF-007 | Реализовать scheduledReportNotifier | TODO | Не начато | Реализация: Listen to report.generated events. Deliver to configured recipients. Retry on failure. Готово, если: для NOTIF-007 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| NOTIF-008 | Реализовать driftAlertNotifier | TODO | Не начато | Реализация: Listen to drift.threshold.exceeded events. Send alert with drift summary. Configurable threshold. Готово, если: для NOTIF-008 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Worker v0.3.0 — Задача Management

> Timeout, retry, deduplication, and priority. ~70K tokens.

> **Результат версии:** Завершена версия «Worker v0.3.0 — Job Management» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WORKER-JOB-002 | Реализовать задача timeout configuration | TODO | Не начато | Реализация: Per job type. LLM: 60s, Git API: 30s, Total: 15min. Готово, если: для WORKER-JOB-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-JOB-004 | Реализовать retry with exponential backoff | TODO | Не начато | Реализация: Delay = baseDelay \* 4^attempt. Max 5 attempts. Готово, если: для WORKER-JOB-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-JOB-001 | Реализовать задача deduplication | TODO | Не начато | Реализация: By jobId hash. Skip if already processing/completed. Готово, если: для WORKER-JOB-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-JOB-003 | Реализовать задача priority handling | TODO | Не начато | Реализация: HIGH (mentions), NORMAL (webhooks). Priority queue. Готово, если: для WORKER-JOB-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Worker v0.4.0 — Advanced Patterns

> Inbox pattern and circuit breaker. ~70K tokens.

> **Результат версии:** Завершена версия «Worker v0.4.0 — Advanced Patterns» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WORKER-PAT-001 | Реализовать inbox pattern (idempotency) | TODO | Не начато | Реализация: Check message ID before processing. Skip duplicates. Готово, если: для WORKER-PAT-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-PAT-002 | Реализовать DLQ handling + manual retry | TODO | Не начато | Реализация: DLQ monitoring. Manual retry API. Alerting. Готово, если: для WORKER-PAT-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-INFRA-004 | Реализовать circuit breaker pattern | TODO | Не начато | Реализация: Open after 5 failures. Half-open after 30s. Close on success. Готово, если: для WORKER-INFRA-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Worker v0.5.0 — Outbox/Inbox Интеграция

> Transactional messaging reliability. ~70K tokens.

> **Результат версии:** Завершена версия «Worker v0.5.0 — Outbox/Inbox Integration» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WORKER-MSG-001 | Реализовать outboxRelayWorker | TODO | Не начато | Реализация: Process and relay outbox messages. Готово, если: для WORKER-MSG-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-MSG-002 | Реализовать inboxConsumer | TODO | Не начато | Реализация: Consume messages with deduplication. Готово, если: для WORKER-MSG-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-MSG-003 | Реализовать outboxCleanupJob | TODO | Не начато | Реализация: Cleanup old sent outbox messages. Готово, если: для WORKER-MSG-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-MSG-004 | Реализовать inboxCleanupJob | TODO | Не начато | Реализация: Cleanup old processed inbox messages. Готово, если: для WORKER-MSG-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Messaging v0.3.0 — Scan & Causal Event Topics

> Новые event topics для сканирования и causal analysis. ~20K tokens.

> **Результат версии:** Завершена версия «Messaging v0.3.0 — Scan & Causal Event Topics» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| MSG-005 | Реализовать scanEventTopics | TODO | Не начато | Реализация: Topics: scan.requested, scan.started, scan.progress, scan.completed, scan.failed. Schema registration. Готово, если: для MSG-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| MSG-006 | Реализовать causalAnalysisTopics | TODO | Не начато | Реализация: Topics: causal.coupling.computed, causal.bugs.tracked, causal.health.updated. Schema registration. Готово, если: для MSG-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## База данных v0.2.0 — Comment Tracking

> MongoDB adapter для ICommentTracker порта (re-review workflow).

> **Результат версии:** Завершена версия «Database v0.2.0 — Comment Tracking» в рамках M16; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| DB-007 | Реализовать mongoCommentTrackerAdapter | TODO | Не начато | Реализация: Schema: review_comments с TTL 90 дней. Adapter: findByReviewId(), save(), saveMany(), deleteByReviewId(). IoC wiring. 9 тестов, 100%. Готово, если: для DB-007 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---
