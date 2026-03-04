# M17 — Full UI + Production

> Источник: `packages/runtime/TODO.md`

> **Задач:** ~130 | **Проверка:** Docker Compose, CI/CD, все API endpoints, все workers

> **Результат milestone:** Готов production-контур: OPS, deployment, stability, full process set.

## API v0.8.0 — Advanced Очередь Features

> Transactional outbox, job tracking, SSE. ~70K tokens.

> **Результат версии:** Завершена версия «API v0.8.0 — Advanced Queue Features» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-QUEUE-002 | Реализовать transactional Outbox pattern | TODO | Не начато | Реализация: Reliable message publishing. Готово, если: transactional outbox гарантирует публикацию сообщений без потери при падении процесса между commit и publish, повторный relay не создаёт дубликатов; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-QUEUE-003 | Реализовать задача status tracking API | TODO | Не начато | Реализация: Get job status by ID. Готово, если: status API возвращает актуальные состояния queued/running/succeeded/failed с корреляцией по jobId и не выдаёт устаревшие статусы после retry; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-QUEUE-004 | Реализовать задача progress events (SSE) | TODO | Не начато | Реализация: Real-time progress streaming. Готово, если: SSE progress stream устойчив к reconnect и отдаёт пропущенные события по last-event-id без потери порядка прогресса; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CFG-003 | Реализовать feature flags | TODO | Не начато | Реализация: Feature flag management. Готово, если: для API-CFG-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.9.0 — MCP Server Модуль

> Model Context Protocol server. ~80K tokens.

> **Результат версии:** Завершена версия «API v0.9.0 — MCP Server Module» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-MCP-001 | Реализовать MCP module setup | TODO | Не начато | Реализация: Модуль configuration. Готово, если: для API-MCP-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-MCP-002 | Реализовать MCP SSE transport | TODO | Не начато | Реализация: Server-Sent Events transport. Готово, если: MCP SSE transport корректно обрабатывает connect/disconnect/backpressure, не теряет сообщения при кратковременных разрывах и закрывает сессии без утечек ресурсов; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-MCP-003 | Реализовать MCP tool registration | TODO | Не начато | Реализация: Register available tools. Готово, если: для API-MCP-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-MCP-004 | Реализовать MCP authentication | TODO | Не начато | Реализация: API key authentication. Готово, если: для API-MCP-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-010 | Реализовать MCPController | TODO | Не начато | Реализация: POST /mcp/* (MCP protocol). Готово, если: для API-CTRL-010 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.10.0 — External Context Модуль

> External context providers and caching. ~70K tokens.

> **Результат версии:** Завершена версия «API v0.10.0 — External Context Module» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-EXT-001 | Реализовать external context module setup | TODO | Не начато | Реализация: Модуль configuration. Готово, если: для API-EXT-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-EXT-002 | Реализовать context provider registry | TODO | Не начато | Реализация: Register context providers. Готово, если: для API-EXT-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-EXT-003 | Реализовать context caching layer | TODO | Не начато | Реализация: Cache loaded context. Готово, если: для API-EXT-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-011 | Реализовать externalContextController | TODO | Не начато | Реализация: GET/POST /context/*. Готово, если: для API-CTRL-011 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.11.0 — Репозиторий Конфигурация Модуль

> Repository configuration management. ~60K tokens.

> **Результат версии:** Завершена версия «API v0.11.0 — Repository Config Module» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-RCFG-001 | Реализовать конфигурация file fetcher (from repo) | TODO | Не начато | Реализация: Fetch codenautic-config.yml. Готово, если: для API-RCFG-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-RCFG-002 | Реализовать конфигурация validation endpoint | TODO | Не начато | Реализация: Validate config schema. Готово, если: для API-RCFG-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-RCFG-003 | Реализовать конфигурация preview/diff endpoint | TODO | Не начато | Реализация: Preview config changes. Готово, если: для API-RCFG-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-012 | Реализовать конфигурацияКонтроллер | TODO | Не начато | Реализация: GET/POST /config/*. Готово, если: для API-CTRL-012 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.12.0 — Review Modes & Additional Контроллерs

> Dry-run, CCR summary, IDE sync, issues, rules, audit. ~100K tokens.

> **Результат версии:** Завершена версия «API v0.12.0 — Review Modes & Additional Controllers» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-CTRL-013 | Реализовать dryRunController | TODO | Не начато | Реализация: POST /dry-run/*. Готово, если: для API-CTRL-013 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-014 | Реализовать CCRSummaryController | TODO | Не начато | Реализация: GET/POST /ccr-summary/*. Готово, если: для API-CTRL-014 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-015 | Реализовать ideSyncController | TODO | Не начато | Реализация: GET/POST /ide-sync/*. Готово, если: для API-CTRL-015 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-019 | Реализовать issuesController | TODO | Не начато | Реализация: GET/POST /issues/*. Готово, если: для API-CTRL-019 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-020 | Реализовать rulesController | TODO | Не начато | Реализация: GET/POST /rules/*. Готово, если: для API-CTRL-020 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-021 | Реализовать auditController | TODO | Не начато | Реализация: GET /audit/*. Готово, если: для API-CTRL-021 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.13.0 — Task Management

> Task persistence (MongoDB) and task tracking API. ~70K tokens.

> **Результат версии:** Завершена версия «API v0.13.0 — Task Management» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-DB-005 | Реализовать task MongoDB schema + repository | TODO | Не начато | Реализация: Mongoose schema for Task entity. MongoTaskRepository реализует ITaskRepository. Готово, если: для API-DB-005 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-DB-006 | Реализовать wire messaging MongoDB repositories | TODO | Не начато | Реализация: Replace in-memory Outbox/Inbox stubs with MongoOutboxRepository/MongoInboxRepository from @codenautic/messaging. Готово, если: для API-DB-006 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-016 | Реализовать tasksController | TODO | Не начато | Реализация: GET /tasks/:id. Готово, если: для API-CTRL-016 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-017 | Реализовать taskProgressController | TODO | Не начато | Реализация: GET /tasks/:id/progress (SSE). Готово, если: для API-CTRL-017 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-018 | Реализовать taskCancelController | TODO | Не начато | Реализация: POST /tasks/:id/cancel. Готово, если: для API-CTRL-018 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.14.0 — Additional Наблюдаемость

> Extended monitoring and analytics. ~60K tokens.

> **Результат версии:** Завершена версия «API v0.14.0 — Additional Observability» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-OBS-006 | Реализовать pyroscope profiling | TODO | Не начато | Реализация: Continuous profiling integration. Готово, если: для API-OBS-006 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OBS-007 | Реализовать postHog analytics | TODO | Не начато | Реализация: Product analytics integration. Готово, если: для API-OBS-007 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OBS-008 | Реализовать segment event tracking | TODO | Не начато | Реализация: Event analytics integration. Готово, если: для API-OBS-008 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OBS-009 | Реализовать langSmith LLM tracing | TODO | Не начато | Реализация: LLM call tracing. Готово, если: для API-OBS-009 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.15.0 — Conversation & Issues API

> Conversation threads and issue ticket management. ~40K tokens.

> **Результат версии:** Завершена версия «API v0.15.0 — Conversation & Issues API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-CTRL-022 | Реализовать conversationController | TODO | Не начато | Реализация: POST /api/conversations/chat. Thread management. Auth + Ограничение частоты запросов. Готово, если: для API-CTRL-022 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-023 | Реализовать issueTicketsController | TODO | Не начато | Реализация: GET/POST /api/issue-tickets. Filter by status, repo, severity. Pagination. Готово, если: для API-CTRL-023 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.18.0 — Causal Analysis API

> HTTP endpoints для причинно-следственного анализа. ~60K tokens.

> **Результат версии:** Завершена версия «API v0.18.0 — Causal Analysis API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-CAUSE-001 | Реализовать temporalCouplingEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/coupling. Возвращает file pairs with coupling score. Query: minScore, limit, dateRange. Готово, если: для API-CAUSE-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CAUSE-002 | Реализовать bugIntroductionEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/bugs. Возвращает bug introduction history. Filter: severity, author, dateRange. Готово, если: для API-CAUSE-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CAUSE-003 | Реализовать rootCauseChainEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/root-cause/:issueId. Возвращает causal chain from symptom to root cause. Готово, если: для API-CAUSE-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CAUSE-004 | Реализовать healthTrendsEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/health/trends. Возвращает health score history. Query: period (week/month/quarter). Готово, если: для API-CAUSE-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CAUSE-005 | Реализовать churnComplexityEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/churn-complexity. Возвращает churn vs complexity scatter data. Filter: dateRange, modules. Готово, если: для API-CAUSE-005 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CAUSE-006 | Реализовать causalOverlayEndpoint | TODO | Не начато | Реализация: GET /api/code-city/:repoId/overlays/causal. Возвращает causal overlay data for CodeCity visualization. Готово, если: для API-CAUSE-006 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.19.0 — Onboarding & Tour API

> HTTP endpoints для онбординга разработчиков. ~40K tokens.

> **Результат версии:** Завершена версия «API v0.19.0 — Onboarding & Tour API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-ONBOARD-001 | Реализовать projectOverviewEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/overview. Возвращает project summary: tech stack, architecture, key modules. Готово, если: для API-ONBOARD-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-ONBOARD-002 | Реализовать guidedTourEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/tour. Возвращает guided tour steps: critical paths, entry points, dependencies. Готово, если: для API-ONBOARD-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-ONBOARD-003 | Реализовать exploreRecommendEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/explore. Возвращает recommended exploration paths based on developer role/experience. Готово, если: для API-ONBOARD-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.20.0 — Refactoring Planning API

> HTTP endpoints для планирования рефакторинга. ~40K tokens.

> **Результат версии:** Завершена версия «API v0.20.0 — Refactoring Planning API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-REFAC-001 | Реализовать refactoringTargetsEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/refactoring/targets. Возвращает prioritized refactoring targets with ROI estimates. Готово, если: для API-REFAC-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-REFAC-002 | Реализовать rOICalculatorEndpoint | TODO | Не начато | Реализация: POST /api/repos/:repoId/refactoring/roi. Calculate ROI for proposed refactoring. Input: target files/areas. Готово, если: для API-REFAC-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-REFAC-003 | Реализовать refactoringSimEndpoint | TODO | Не начато | Реализация: POST /api/repos/:repoId/refactoring/simulate. Simulate refactoring impact on metrics. Возвращает before/after. Готово, если: для API-REFAC-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.21.0 — Knowledge Map & Bus Factor API

> HTTP endpoints для карты знаний и bus factor. ~50K tokens.

> **Результат версии:** Завершена версия «API v0.21.0 — Knowledge Map & Bus Factor API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-KNOWL-001 | Реализовать ownershipMapEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/ownership. Возвращает file ownership map. Query: module, minCommits. Готово, если: для API-KNOWL-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-KNOWL-002 | Реализовать busFactorEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/bus-factor. Возвращает bus factor per module/directory. Risk levels: critical/warn. Готово, если: для API-KNOWL-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-KNOWL-003 | Реализовать knowledgeSiloEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/silos. Возвращает knowledge silos — areas with single contributor. Готово, если: для API-KNOWL-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-KNOWL-004 | Реализовать contributorGraphEndpoint | TODO | Не начато | Реализация: GET /api/repos/:repoId/contributors/graph. Возвращает contributor collaboration graph. Готово, если: для API-KNOWL-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.21.1 — Review Comment History API

> HTTP endpoints для просмотра истории комментариев review и tracking re-review. Prerequisite: core v0.63.1 (ICommentTracker), review-worker v0.4.1 (CommentTrackerMongoAdapter).

> **Результат версии:** Завершена версия «API v0.21.1 — Review Comment History API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-CMNT-001 | Реализовать reviewCommentsEndpoint | TODO (P1) | Не начато | Реализация: GET /api/reviews/:reviewId/comments. Возвращает список комментариев review с metadata (filePath, line, status: active/resolved/updated). Готово, если: для API-CMNT-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CMNT-002 | Реализовать commentHistoryEndpoint | TODO (P2) | Не начато | Реализация: GET /api/reviews/:reviewId/comments/:commentId/history. Возвращает историю изменений комментария: создание, обновления, resolution. Готово, если: для API-CMNT-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.22.0 — Impact Planning & Prediction API

> HTTP endpoints для анализа impact и AI-предсказаний. ~50K tokens.

> **Результат версии:** Завершена версия «API v0.22.0 — Impact Planning & Prediction API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-IMPACT-001 | Реализовать impactAnalysisEndpoint | TODO (P1) | Не начато | Реализация: POST /api/repos/:repoId/impact. Input: filePaths[]. Возвращает blast radius: affected files, tests, consumers. Готово, если: для API-IMPACT-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-IMPACT-002 | Реализовать changeRiskEndpoint | TODO (P1) | Не начато | Реализация: POST /api/repos/:repoId/impact/risk. Возвращает risk assessment for proposed changes. Historical data + LLM. Готово, если: для API-IMPACT-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-PREDICT-001 | Реализовать predictionEndpoint | TODO (P1) | Не начато | Реализация: GET /api/repos/:repoId/predictions. Возвращает AI predictions: bug-prone files, churn forecast, quality trends. Готово, если: для API-PREDICT-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-PREDICT-002 | Реализовать predictionExplainEndpoint | TODO (P1) | Не начато | Реализация: GET /api/repos/:repoId/predictions/:id/explain. Возвращает LLM explanation of statistical prediction. Готово, если: для API-PREDICT-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-PREDICT-003 | Реализовать hotspotForecastEndpoint | TODO (P2) | Не начато | Реализация: GET /api/repos/:repoId/predictions/hotspots. Возвращает predicted future hotspots based on trends. Готово, если: для API-PREDICT-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.24.0 — Sprint Gamification API

> HTTP endpoints для спринтовой геймификации. ~40K tokens.

> **Результат версии:** Завершена версия «API v0.24.0 — Sprint Gamification API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-GAME-001 | Реализовать sprintComparisonEndpoint | TODO (P2) | Не начато | Реализация: GET /api/repos/:repoId/sprints/compare. Возвращает before/after metrics for sprint. Query: sprintId, metrics. Готово, если: для API-GAME-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-GAME-002 | Реализовать districtTrendsEndpoint | TODO (P2) | Не начато | Реализация: GET /api/repos/:repoId/districts/trends. Возвращает trend indicators per CodeCity district. Готово, если: для API-GAME-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-GAME-003 | Реализовать sprintAchievementsEndpoint | TODO (P2) | Не начато | Реализация: GET /api/repos/:repoId/sprints/:id/achievements. Возвращает unlocked achievements for sprint. Готово, если: для API-GAME-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-GAME-004 | Реализовать teamLeaderboardEndpoint | TODO (P3) | Не начато | Реализация: GET /api/repos/:repoId/leaderboard. Возвращает team quality leaderboard. Period: sprint/month/quarter. Готово, если: для API-GAME-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.25.0 — Architecture Drift API

> HTTP endpoints для отслеживания архитектурного дрифта. ~50K tokens.

> **Результат версии:** Завершена версия «API v0.25.0 — Architecture Drift API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-DRIFT-001 | Реализовать blueprintUploadEndpoint | TODO (P1) | Не начато | Реализация: POST /api/repos/:repoId/blueprint. Upload architecture blueprint (YAML/JSON). Validate schema. Готово, если: для API-DRIFT-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-DRIFT-002 | Реализовать driftAnalysisEndpoint | TODO (P1) | Не начато | Реализация: GET /api/repos/:repoId/drift. Возвращает drift report: violations, new dependencies, layer breaches. Готово, если: для API-DRIFT-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-DRIFT-003 | Реализовать driftHistoryEndpoint | TODO (P1) | Не начато | Реализация: GET /api/repos/:repoId/drift/history. Возвращает drift score over time. Query: period, granularity. Готово, если: для API-DRIFT-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-DRIFT-004 | Реализовать driftOverlayEndpoint | TODO (P2) | Не начато | Реализация: GET /api/code-city/:repoId/overlays/drift. Возвращает drift overlay data for CodeCity visualization. Готово, если: для API-DRIFT-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-DRIFT-005 | Реализовать architectureCompareEndpoint | TODO (P2) | Не начато | Реализация: GET /api/repos/:repoId/drift/compare. Blueprint vs reality side-by-side comparison. Готово, если: для API-DRIFT-005 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.26.0 — Executive Reports API

> HTTP endpoints для генерации отчётов. ~60K tokens.

> **Результат версии:** Завершена версия «API v0.26.0 — Executive Reports API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-REPORT-001 | Реализовать reportGenerateEndpoint | TODO (P1) | Не начато | Реализация: POST /api/repos/:repoId/reports. Generate report. Type: executive/technical/sprint. Format: PDF/PNG. Готово, если: для API-REPORT-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-REPORT-002 | Реализовать reportStatusEndpoint | TODO (P1) | Не начато | Реализация: GET /api/repos/:repoId/reports/:id. Возвращает generation status and download URL when ready. Готово, если: для API-REPORT-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-REPORT-003 | Реализовать reportListEndpoint | TODO (P1) | Не начато | Реализация: GET /api/repos/:repoId/reports. Возвращает generated reports list. Filter: type, dateRange. Pagination. Готово, если: для API-REPORT-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-REPORT-004 | Реализовать reportScheduleEndpoint | TODO (P2) | Не начато | Реализация: PUT /api/repos/:repoId/reports/schedule. Set up scheduled report delivery. Cron + recipients. Готово, если: для API-REPORT-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-REPORT-005 | Реализовать reportTemplateEndpoint | TODO (P2) | Не начато | Реализация: GET/POST /api/repos/:repoId/reports/templates. CRUD for report templates. Custom sections and branding. Готово, если: для API-REPORT-005 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-REPORT-006 | Реализовать aISummaryEndpoint | TODO (P1) | Не начато | Реализация: POST /api/repos/:repoId/reports/ai-summary. LLM-generated narrative summary of repository state. Готово, если: для API-REPORT-006 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.27.0 — Review Context API

> HTTP endpoints для CodeCity как контекста при ревью. ~30K tokens.

> **Результат версии:** Завершена версия «API v0.27.0 — Review Context API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-RVCTX-001 | Реализовать reviewContextEndpoint | TODO (P1) | Не начато | Реализация: GET /api/reviews/:reviewId/context. Возвращает CodeCity context for files in review. Neighborhood data. Готово, если: для API-RVCTX-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-RVCTX-002 | Реализовать reviewImpactOverlay | TODO (P1) | Не начато | Реализация: GET /api/reviews/:reviewId/impact-overlay. Возвращает CodeCity overlay showing CCR impact on city. Готово, если: для API-RVCTX-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-RVCTX-003 | Реализовать reviewHistoryHeatEndpoint | TODO (P2) | Не начато | Реализация: GET /api/reviews/:reviewId/history-heat. Возвращает historical review activity heatmap for CCR files. Готово, если: для API-RVCTX-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.28.0 — Feedback & Очередь Publishing API

> Явные endpoints для публикации в BullMQ очереди. ~40K tokens.

> **Результат версии:** Завершена версия «API v0.28.0 — Feedback & Queue Publishing API» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-FDBK-001 | Реализовать feedbackController | TODO (P1) | Не начато | Реализация: POST /api/feedback. Принимает feedback (rating, comment, reviewId, issueId). Публикует в `analytics.feedback` queue. Готово, если: для API-FDBK-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-FDBK-002 | Реализовать feedbackListEndpoint | TODO (P1) | Не начато | Реализация: GET /api/feedback. История фидбека пользователя. Filter: reviewId, dateRange. Pagination. Готово, если: для API-FDBK-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-QUEUE-005 | Реализовать очередьPublishGuard | TODO (P1) | Не начато | Реализация: Централизованный guard: валидация payload перед publish. **Zod-схемы из core (CORE-385–386).** Guard использует shared schemas. Logging. Готово, если: для API-QUEUE-005 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.29.0 — OPS: Deployment & Инфраструктура

> Docker Compose, PM2, CI/CD, env configs, migrations, monitoring, backup. Кросс-пакетные задачи — координируются из api как главного composition root.

> **Результат версии:** Завершена версия «API v0.29.0 — OPS: Deployment & Infrastructure» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-OPS-001 | Реализовать docker Compose | TODO (P0) | Не начато | Реализация: 11 процессов + MongoDB 8 + Redis 7.4 + Qdrant 1.13. Dev и prod профили. Health checks для каждого сервиса. `.env.example`. Готово, если: для API-OPS-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OPS-002 | Реализовать pM2 ecosystem config | TODO (P0) | Не начато | Реализация: `ecosystem.config.js`: 11 entrypoints. Cluster mode для api. Log rotation. Restart policy. Memory limits. Env variables per process. Готово, если: для API-OPS-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OPS-003 | Реализовать environment configs | TODO (P0) | Не начато | Реализация: Prod/staging/dev конфиги. Zod-валидация env vars при старте каждого процесса. `.env.example` с описанием каждой переменной. Fail-fast при отсутствии. Готово, если: для API-OPS-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OPS-004 | Реализовать cI/CD pipeline | TODO (P0) | Не начато | Реализация: GitHub Actions: Build → Test → Lint → Deploy. Per-package caching (bun lockfile). Matrix strategy для пакетов. Deploy: Docker image push. Готово, если: для API-OPS-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OPS-005 | Реализовать MongoDB schema migrations | TODO (P1) | Не начато | Реализация: Migration framework (migrate-mongo или custom). Indexes для всех collections. Seed data для dev. Rollback support. Версионирование миграций. Готово, если: для API-OPS-005 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OPS-006 | Реализовать qdrant collection mgmt | TODO (P1) | Не начато | Реализация: Collection creation scripts. Schema updates при деплое. Re-indexing strategy при изменении embedding model. Backup перед migration. Готово, если: для API-OPS-006 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OPS-007 | Реализовать production monitoring | TODO (P1) | Не начато | Реализация: Grafana dashboards: process health, queue depth, review latency, error rate. Prometheus alerts: worker down >5min, queue >1000, error rate >5%. PagerDuty. Готово, если: для API-OPS-007 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OPS-008 | Реализовать backup strategy | TODO (P1) | Не начато | Реализация: MongoDB: daily mongodump, retention 30 дней. Qdrant: snapshots, retention 7 дней. Redis: RDB + AOF, failover config. Restore. Готово, если: для API-OPS-008 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.30.0 — OPS: Тестирование & Безопасность

> Load testing и security audit.

> **Результат версии:** Завершена версия «API v0.30.0 — OPS: Testing & Security» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-OPS-009 | Реализовать load testing | TODO (P2) | Не начато | Реализация: K6 или artillery: review pipeline under load. Target: 10 concurrent reviews. Очередь depth limits. Memory monitoring. Latency percentiles (p95). Готово, если: для API-OPS-009 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OPS-010 | Реализовать безопасность audit | TODO (P2) | Не начато | Реализация: OWASP top 10 checklist. Dependency scanning (snyk/npm audit). Secrets detection (gitleaks). CSP headers. Rate limit verification. Готово, если: для API-OPS-010 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Webhooks v0.8.0 — Push-triggered Reindex

> Автоматический реиндекс при push событиях. ~40K tokens.

> **Результат версии:** Завершена версия «Webhooks v0.8.0 — Push-triggered Reindex» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WH-PUSH-001 | Реализовать pushEventDetector | TODO | Не начато | Реализация: Detect push events from GitHub/GitLab/Azure/Bitbucket. Extract: ref, commits, changed files. Готово, если: для WH-PUSH-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-PUSH-002 | Реализовать defaultBranchFilter | TODO | Не начато | Реализация: Filter push events: only trigger reindex for default branch. Configurable per repo. Готово, если: для WH-PUSH-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-PUSH-003 | Реализовать incrementalScanTrigger | TODO | Не начато | Реализация: On push to default branch → emit ScanRequested event with changed file paths. Debounce rapid pushes. Готово, если: для WH-PUSH-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-PUSH-004 | Реализовать pushEventThrottler | TODO | Не начато | Реализация: Throttle scan triggers: max 1 scan per N minutes per repo. Очередь excess. Configurable threshold. Готово, если: для WH-PUSH-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Webhooks v0.9.0 — OPS: E2E Интеграция Test

> E2E тест: webhook → review → comment. Полный flow от внешнего события до результата.

> **Результат версии:** Завершена версия «Webhooks v0.9.0 — OPS: E2E Integration Test» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WH-E2E-001 | Реализовать e2E: webhook → review → comment | TODO | Не начато | Реализация: GitHub webhook POST → webhooks → review.trigger → review-worker → definition-driven review pipeline → IGitProvider.createComment(). Mock Git API. <60 sec. Готово, если: e2e подтверждает корректную обработку `definitionVersion` и checkpoint/resume в review-worker, а terminal status и публикация комментария остаются консистентными для happy/failure сценариев; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Review Worker v0.4.1 — Comment Batching & Re-Review Wiring

> DI-wiring для batch comments и comment tracking в review pipeline. Prerequisite: core v0.63.1 (IBatchReviewRequest, ICommentTracker), git-providers v0.5.1 (createReview, resolveOutdatedComments).

> **Результат версии:** Завершена версия «Review Worker v0.4.1 — Comment Batching & Re-Review Wiring» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| REVW-017 | Реализовать commentTrackerMongoAdapter | TODO | Не начато | Реализация: MongoCommentTrackerAdapter в @codenautic/database. Schema review_comments с TTL 90 дней. findByReviewId(), save(), saveMany(), deleteByReviewId(). 9 тестов, 100%. Готово, если: для REVW-017 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-018 | Реализовать wire batch stages in DI | TODO | Не начато | Реализация: Удалён NoOpCommentTracker. ICommentTracker резолвится из registerDatabaseModule() (MongoCommentTrackerAdapter). Тесты обновлены. Готово, если: для REVW-018 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-019 | Реализовать re-review integration | TODO | Не начато | Реализация: `ResolveOutdatedCommentsStage` подключён в pipeline через `PipelineDefinition` (alias default v1: stage 14). Использует `ICommentTracker` для загрузки/удаления records. 21 stage aliases в расширенной definition. Готово, если: интеграция работает при смене `definitionVersion` без правок worker-кода, in-flight jobs на старой версии завершаются корректно, а e2e покрывает re-review happy/failure ветки; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Review Worker v0.5.0 — SafeGuard & Expert Panel

> AI hallucination filtering и multi-model verification. ~70K tokens.

> **Результат версии:** Завершена версия «Review Worker v0.5.0 — SafeGuard & Expert Panel» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| REVW-013 | Реализовать safeGuardGate | TODO | Не начато | Реализация: 5 SafeGuard фильтров wired в ValidateSuggestionsStage: Deduplication → SeverityThreshold → ImplementationCheck → Hallucination → PrioritySort. EnvConfig для LLM_MODEL. Готово, если: для REVW-013 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-014 | Реализовать expertPanelOrchestrator | TODO | Не начато | Реализация: ExpertPanelFilter в core: multi-model verification для HIGH/CRITICAL. Env: EXPERT_PANEL_MODELS, EXPERT_PANEL_CONSENSUS. Wired в `ValidateSuggestionsStage` как stage-use-case dependency с lifecycle events. Готово, если: orchestrator корректно учитывает результаты expert panel в текущей `definitionVersion`, поддерживает retry/recoverable ошибки и покрыт e2e/integration тестами для high/critical scenarios; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-015 | Реализовать reviewRetryHandler | TODO | Не начато | Реализация: `ReviewRetryProcessor`: обработка `review.retry` queue, resume run по checkpoint (если доступен) или restart с тем же `definitionVersion` (если checkpoint отсутствует), re-enqueue в `review.trigger`. Env: `RETRY_MAX_ATTEMPTS`. TriggerJobQueue producer. 9 тестов. Готово, если: retry не приводит к смене версии pipeline для in-flight run, сохраняется корректная попытка stage (`attempt`) и после исчерпания попыток задача уходит в DLQ с полным stage trace; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Scan Worker v0.3.0 — Embedding & Vector Indexing

> Code chunking, embedding generation, Qdrant indexing, graph persistence. ~80K tokens.

> **Результат версии:** Завершена версия «Scan Worker v0.3.0 — Embedding & Vector Indexing» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| SCAN-009 | Реализовать embeddingIndexer | TODO | Не начато | Реализация: Chunk code (function/class/type strategies) → IEmbeddingGenerationService.embed() → IVectorRepository.upsert(). Batch 100 chunks. Update on incremental scan. Готово, если: для SCAN-009 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SCAN-010 | Реализовать graphPersister | TODO | Не начато | Реализация: Save ICodeGraph to MongoDB via IGraphRepository.saveGraph(). Upsert nodes/edges. Delete orphaned nodes after incremental scan. Готово, если: для SCAN-010 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SCAN-011 | Реализовать metricsCalculator | TODO | Не начато | Реализация: Compute PageRank (PageRankService), blast radius, file metrics after graph build. Store as IHotspot[] and IFileMetrics. Готово, если: для SCAN-011 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SCAN-012 | Реализовать cleanupManager | TODO | Не начато | Реализация: Cleanup temp cloned repos after scan. Cleanup old embeddings for deleted files. Configurable retention. Disk space monitoring. Готово, если: для SCAN-012 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Scan Worker v0.5.0 — OPS: E2E Интеграция Test

> E2E тест: web → API → scan-worker → результат.

> **Результат версии:** Завершена версия «Scan Worker v0.5.0 — OPS: E2E Integration Test» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| SCAN-016 | Реализовать e2E: web → API → worker → result | TODO (P1) | Не начато | Реализация: UI trigger scan → API → scan.repo queue → scan-worker → MongoDB graph + Qdrant vectors → API read → UI display. Docker Compose. Готово, если: для SCAN-016 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Agent Worker v0.3.0 — Streaming & Model Selection

> Streaming responses, конфигурируемая модель, улучшенный контекст. ~60K tokens.

> **Результат версии:** Завершена версия «Agent Worker v0.3.0 — Streaming & Model Selection» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AGNT-010 | Реализовать streamingChatProcessor | TODO | Не начато | Реализация: `ILLMProvider.stream()` вместо `chat()`. AsyncIterable<ЧатChunk> → progressive response. Отправка partial response каждые N chunks. Готово, если: для AGNT-010 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| AGNT-011 | Реализовать modelSelectionConfig | TODO | Не начато | Реализация: Конфигурация модели per-repository: default model, fallback model, temperature, maxTokens. Из repo settings через `IRepositoryConfigRepository`. Готово, если: для AGNT-011 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| AGNT-012 | Реализовать enhancedRAGContext | TODO | Не начато | Реализация: Исправить `_repositoryId` баг: фильтрация vector search по repositoryId. Добавить graph context: file dependencies через `IGraphRepository.queryNeighbors()`. Готово, если: для AGNT-012 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| AGNT-013 | Реализовать conversationMemoryManager | TODO | Не начато | Реализация: Управление длиной контекста: sliding window на thread messages. Token counting. Summarize old messages при превышении лимита. Max context budget. Готово, если: для AGNT-013 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| AGNT-014 | Реализовать systemPromptBuilder | TODO | Не начато | Реализация: Динамический system prompt: repo info (language, framework) + review context (if CCR) + user role. Заменяет hardcoded однострочник. Template engine. Готово, если: для AGNT-014 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Agent Worker v0.4.0 — Mention Command Handlers

> Полный набор command handlers для @codenautic mention в CCR. ~70K tokens.

> **Результат версии:** Завершена версия «Agent Worker v0.4.0 — Mention Command Handlers» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AGNT-015 | Реализовать reviewCommandHandler | TODO (P2) | Не начато | Реализация: Adapter: вызывает ReviewCommandUseCase из core (CORE-379). Wire DI, respond в thread. Готово, если: для AGNT-015 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| AGNT-016 | Реализовать explainCommandHandler | TODO (P2) | Не начато | Реализация: Adapter: вызывает ExplainCommandUseCase из core (CORE-380). Wire DI, respond inline. Готово, если: для AGNT-016 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| AGNT-017 | Реализовать fixCommandHandler | TODO (P2) | Не начато | Реализация: Adapter: вызывает FixCommandUseCase из core (CORE-381). Wire DI, respond с code block. Готово, если: для AGNT-017 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| AGNT-018 | Реализовать summaryCommandHandler | TODO (P2) | Не начато | Реализация: Adapter: вызывает SummaryCommandUseCase из core (CORE-382). Wire DI, respond. Готово, если: для AGNT-018 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| AGNT-019 | Реализовать helpCommandHandler | TODO (P2) | Не начато | Реализация: Adapter: вызывает HelpCommandUseCase из core (CORE-383). Static response, no LLM call. Готово, если: для AGNT-019 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| AGNT-020 | Реализовать configCommandHandler | TODO (P2) | Не начато | Реализация: Adapter: вызывает ConfigCommandUseCase из core (CORE-384). Только maintainers. Готово, если: для AGNT-020 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| AGNT-021 | Реализовать mentionJobConsumer | TODO (P2) | Не начато | Реализация: BullMQ consumer для `agent.conversation` с commandType routing. Dispatch к соответствующему handler. Unknown command → HelpCommandHandler. Готово, если: для AGNT-021 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Notification Worker v0.3.0 — Templates & Audit

> Notification templating, retry management, delivery audit logging. ~50K tokens.

> **Результат версии:** Завершена версия «Notification Worker v0.3.0 — Templates & Audit» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| NOTF-011 | Реализовать notificationTemplateEngine | TODO | Не начато | Реализация: Шаблоны по типу уведомления (review_completed, critical_issue, drift_alert, report_ready). Переменные подстановки. Per-channel formatting. Готово, если: для NOTF-011 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| NOTF-012 | Реализовать deliveryRetryManager | TODO | Не начато | Реализация: Retry failed deliveries: exponential backoff (1s → 4s → 16s). Max 5 attempts. DLQ после исчерпания. Per-channel retry config. **Важно:** использовать `RetryExecutor` из `@codenautic/core` (`shared/resilience`). Не создавать локальную retry-логику. Готово, если: для NOTF-012 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| NOTF-013 | Реализовать deliveryAuditLogger | TODO | Не начато | Реализация: Log каждой delivery attempt: timestamp, channel, recipient, status (sent/failed/retried), error. MongoDB collection `notification_audit`. Query API. Готово, если: для NOTF-013 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Analytics Worker v0.3.0 — Use Case Orchestration

> Интеграция domain use cases из core в worker jobs. ~60K tokens.

> **Результат версии:** Завершена версия «Analytics Worker v0.3.0 — Use Case Orchestration» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| ANLYT-010 | Реализовать temporalCouplingAnalyzer | TODO (P2) | Не начато | Реализация: Задача: вызывает AnalyzeTemporalCouplingUseCase для каждого repo. Store coupling data. Scheduled weekly. Готово, если: для ANLYT-010 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| ANLYT-011 | Реализовать codeHealthTrendCalculator | TODO (P1) | Не начато | Реализация: Задача: вызывает CalculateCodeHealthTrendUseCase. Aggregate per directory → per repo. Store trend data. Готово, если: для ANLYT-011 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| ANLYT-012 | Реализовать causalAnalysisExecutor | TODO (P2) | Не начато | Реализация: Задача: вызывает BuildRootCauseChainUseCase для critical issues. Store causal chains. Triggered after review completion. Готово, если: для ANLYT-012 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| ANLYT-013 | Реализовать sprintSnapshotCollector | TODO (P2) | Не начато | Реализация: Задача: вызывает TakeSprintSnapshotUseCase at sprint boundary. CompareSprintsUseCase after. Store snapshots. Triggered by scheduler. Готово, если: для ANLYT-013 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Scheduler v0.2.0 — Built-in Jobs

> Конкретные cron jobs для каждого scheduled процесса. ~70K tokens.

> **Результат версии:** Завершена версия «Scheduler v0.2.0 — Built-in Jobs» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| SCHD-005 | Реализовать reportDeliveryJob | TODO | Не начато | Реализация: Cron: daily 09:00 UTC. findDue(now) → skip без recipients → publishReportDelivery(). Error isolation per schedule. 7 тестов, 100% coverage. Готово, если: для SCHD-005 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SCHD-006 | Реализовать driftScanJob | TODO | Не начато | Реализация: Cron: daily 02:00 UTC. findEnabled() → publishDriftScan() per repo. Error isolation. 5 тестов, 100% coverage. Готово, если: для SCHD-006 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SCHD-007 | Реализовать healthCheckJob | TODO | Не начато | Реализация: Cron: every 5 min. Redis + Mongo checks. Consecutive failure tracking. Recovery alerts. MongoHealthCheck adapter. 8 тестов, 100% coverage. Готово, если: для SCHD-007 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SCHD-008 | Реализовать sprintBoundaryJob | TODO | Не начато | Реализация: Cron: hourly. findActive() → sprint boundary calculation → publishSprintSnapshotTrigger(). 6 тестов, 100% coverage. Готово, если: для SCHD-008 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SCHD-009 | Реализовать outboxCleanupJob | TODO | Не начато | Реализация: Cron: daily 03:00 UTC. deleteSentBefore(7d) + deleteProcessedBefore(7d). Independent cleanup. 7 тестов, 100% coverage. Готово, если: для SCHD-009 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Scheduler v0.3.0 — Конфигурация & Мониторинг

> Dynamic schedule configuration и execution metrics. ~40K tokens.

> **Результат версии:** Завершена версия «Scheduler v0.3.0 — Config & Monitoring» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| SCHD-010 | Реализовать scheduleConfigManager | TODO (P2) | Не начато | Реализация: Read/update job schedules from DB (IScanScheduleRepository). API: enable/disable job, change cron expression per org/repo. Validation. Готово, если: для SCHD-010 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SCHD-011 | Реализовать задачаExecutionMetrics | TODO (P2) | Не начато | Реализация: Track per-job: last run, duration, success/failure count, next run. Expose via health endpoint. Alert on consecutive failures (>3). Готово, если: для SCHD-011 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## MCP v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «MCP v0.0.0 — Package Foundation» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| MCP-000 | Реализовать базовую структуру пакета | TODO | Не начато | Реализация: Package.json, tsconfig.json, tsconfig.build.json, IoC module, barrel export. Сборка проходит успешно. Готово, если: для MCP-000 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## MCP v0.1.0 — MCP Server

> Transport, tool handlers, resource handlers. ~80K tokens.

> **Результат версии:** Завершена версия «MCP v0.1.0 — MCP Server» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| MCP-001 | Реализовать MCPTransport | TODO | Не начато | Реализация: Транспортный слой HTTP/SSE. Готово, если: для MCP-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| MCP-002 | Реализовать mcpToolHandlers | TODO | Не начато | Реализация: Обработчики tool-запросов. Готово, если: для MCP-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| MCP-003 | Реализовать mcpResourceHandlers | TODO | Не начато | Реализация: Обработчики resource-запросов. Готово, если: для MCP-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---
