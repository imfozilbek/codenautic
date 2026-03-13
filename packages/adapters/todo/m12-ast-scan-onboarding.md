# M12 — AST, Scan, Onboarding

> Источник: `packages/adapters/TODO.md`

> **Задач (adapters):** 19 | **Проверка:** AST парсинг, граф, Git scanning

> **Результат milestone:** Готов AST- и scanning-слой для структурного понимания репозитория.

## AST v0.1.0 — Parser Базовый слой

> Base parser classes and factory. ~70K tokens.

> **Результат версии:** Завершена версия «AST v0.1.0 — Parser Foundation» в рамках M12; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-PARSER-001 | Реализовать base parser class | DONE | Реализовано | Реализация: `BaseParser` на tree-sitter с единичным проходом по AST, нормализует imports/type aliases/interfaces/enums/classes/functions/calls в core AST DTO, покрыт contract и failure-path тестами. Готово, если: для AST-PARSER-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-PARSER-002 | Реализовать parser factory | DONE | Реализовано | Реализация: `AstParserFactory` нормализует language aliases, лениво создает `ISourceCodeParser` по canonical language, кэширует tree-sitter backed parser instances и возвращает typed errors для unknown/unsupported/creation-failed сценариев, покрыт contract и failure-path тестами. Готово, если: для AST-PARSER-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-PARSER-005 | Реализовать language detection service | DONE | Реализовано | Реализация: `AstLanguageDetectionService` определяет `SupportedLanguage` по exact filename, extension, shebang и узким content-tiebreakers для script-family runtime сценариев, нормализует пути через `FilePath` и возвращает typed errors для invalid-path/unknown-language кейсов, покрыт contract и failure-path тестами. Готово, если: для AST-PARSER-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.2.0 — TypeScript & JavaScript Parsers

> Core language parsers. ~80K tokens.

> **Результат версии:** Завершена версия «AST v0.2.0 — TypeScript & JavaScript Parsers» в рамках M12; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-PARSER-003 | Реализовать typeScript parser | DONE | Реализовано | Реализация: `TypeScriptSourceCodeParser` выделен как dedicated parser для `.ts/.tsx`, использует `BaseParser`, выбирает корректную tree-sitter grammar для `typescript/tsx`, извлекает classes/interfaces/enums/type aliases/functions и подключён в `AstParserFactory` для TypeScript-family language variants, покрыт contract и failure-path тестами. Готово, если: для AST-PARSER-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-PARSER-004 | Реализовать javaScript parser | DONE | Реализовано | Реализация: `JavaScriptSourceCodeParser` выделен как dedicated parser для `.js/.jsx`, использует `BaseParser`, извлекает classes/functions/requires/exports, подключён в `AstParserFactory` для JavaScript-family language variants, а generic JS wrapper удалён как неиспользуемый, покрыт contract и failure-path тестами. Готово, если: для AST-PARSER-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.3.0 — Построение графа

> CodeGraph builder and enrichment. ~90K tokens.

> **Результат версии:** Завершена версия «AST v0.3.0 — Graph Building» в рамках M12; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-GRAPH-001 | Реализовать codeGraph builder | DONE | Реализовано | Реализация: `AstCodeGraphBuilder` строит детерминированный graph snapshot и lookup indexes (`fileNodes`, `functionNodes`, `typeNodes`) per repo+branch, нормализует `repositoryId`/file paths, генерирует стабильный `graph.id` в формате `repositoryId@branch`, и возвращает typed errors для invalid-repository/duplicate-file/duplicate-node сценариев, покрыт contract и failure-path тестами. Готово, если: для AST-GRAPH-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-GRAPH-002 | Реализовать graph enrichment | DONE | Реализовано | Реализация: `AstCodeGraphEnricher` обогащает node-only graph snapshot семантическими рёбрами `IMPORTS`, `CALLS`, `HAS_METHOD`, `EXTENDS`, `IMPLEMENTS`, использует file/function/type indexes для O(1) резолва и возвращает adjacency lookups (`outgoingEdges`, `incomingEdges`, `edgesByType`), а `core` расширен edge type `HAS_METHOD`; покрыт contract и failure-path тестами. Готово, если: для AST-GRAPH-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-GRAPH-003 | Реализовать pageRank calculation | DONE | Реализовано | Реализация: `AstCodeGraphPageRankService` считает детерминированный PageRank поверх code graph, схлопывает node-level связи до file-level hotspot ranking, поддерживает configurable damping factor и iterations, игнорирует self-loop relations и покрыт contract/failure-path тестами; `core` переведён на новый `ICodeGraphPageRankService` порт без дублирования алгоритма в `GetCodeCityDataUseCase`. Готово, если: для AST-GRAPH-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-GRAPH-004 | Реализовать impact analysis | DONE | Реализовано | Реализация: `AstCodeGraphImpactAnalysisService` выполняет детерминированный DFS по AST code graph, стартует от всех graph nodes изменённых файлов, поддерживает configurable `depth` и направления `forward/backward/both`, синтезирует missing-file breaking change для файлов вне графа и возвращает `ImpactAnalysisResult`-совместимый контракт; покрыт contract и failure-path тестами. Готово, если: для AST-GRAPH-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Git v0.5.0 — Repository Scanning Support

> Методы для полного сканирования репозитория (clone, file tree, blame, history). ~80K tokens.

> **Результат версии:** Завершена версия «Git v0.5.0 — Repository Scanning Support» в рамках M12; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| GIT-009 | Реализовать CloneRepository | DONE | Добавлен `GitRepositoryWorkspaceProvider`: disposable temp workspace, shallow clone, token-authenticated HTTPS remote, checkout requested ref с shallow fetch fallback, cleanup by workspace id, progress callback, typed errors, DI binding и happy/failure-path tests. | Реализация: Clone repo to temp dir. Shallow clone option. Auth via token. Cleanup on dispose. Progress callback. Готово, если: для GIT-009 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-010 | Реализовать GetFullFileTree | TODO | Не начато | Реализация: Возвращает complete file tree for ref. Recursive. Ignore patterns (.gitignore). Возвращает IFileTreeNode[]. Готово, если: для GIT-010 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-011 | Реализовать GetFileBlame | TODO | Не начато | Реализация: Возвращает blame info per line: author, date, commit. Batch support for multiple files. реализует IGitBlame. Готово, если: для GIT-011 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-012 | Реализовать GetCommitHistory | TODO | Не начато | Реализация: Возвращает commit history for file/directory. Pagination. Filters: author, dateRange, path. Возвращает ICommit[]. Готово, если: для GIT-012 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-013 | Реализовать GetBranchList | TODO | Не начато | Реализация: Возвращает all branches. Default branch indicator. Last commit date. Protection status. Готово, если: для GIT-013 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-014 | Реализовать getFileContent | TODO | Не начато | Реализация: Возвращает file content at specific ref. Binary detection. Encoding handling. Size limit check. Готово, если: для GIT-014 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-015 | Реализовать getDiffBetweenRefs | TODO | Не начато | Реализация: Возвращает diff between two refs (commits/branches/tags). Stat summary. Per-file changes. Rename detection. Готово, если: для GIT-015 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-016 | Реализовать getContributorStats | TODO | Не начато | Реализация: Возвращает contributor statistics: commits, lines added/removed, active period. Per-file breakdown. Готово, если: для GIT-016 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-017 | Реализовать getTagList | TODO | Не начато | Реализация: Возвращает all tags. Annotated tag messages. Associated commit. Sorted by date. Готово, если: для GIT-017 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-018 | Реализовать temporalCouplingDataSource | TODO | Не начато | Реализация: Возвращает co-change data: files changed together in commits. Window: configurable commit range. Batch support. Готово, если: для GIT-018 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---
