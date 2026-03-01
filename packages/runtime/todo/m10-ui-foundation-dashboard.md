# M10 — UI Foundation & Dashboard

> Источник: `packages/runtime/TODO.md`

> **Задач (runtime):** 15 | **Проверка:** API middleware, security, observability, core controllers

> **Результат milestone:** Готов production-grade API слой: middleware, security, observability и controllers.

## API v0.3.0 — Промежуточный слой

> Auth, logging, and correlation. ~60K tokens.

> **Результат версии:** Завершена версия «API v0.3.0 — Middleware» в рамках M10; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-MW-001 | Реализовать auth middleware | TODO | Не начато | Реализация: JWT validation. Session handling. Готово, если: auth middleware валидирует JWT/session для всех защищённых маршрутов, невалидный/просроченный токен всегда даёт 401, а валидный контекст корректно прокидывается downstream; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-MW-002 | Реализовать logging middleware | TODO | Не начато | Реализация: Request/response logging. Готово, если: для API-MW-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-MW-003 | Реализовать correlation ID middleware | TODO | Не начато | Реализация: Generate and propagate correlation IDs. Готово, если: для API-MW-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.4.0 — Безопасность

> RBAC, encryption, Ограничение частоты запросов. ~80K tokens.

> **Результат версии:** Завершена версия «API v0.4.0 — Security» в рамках M10; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-SEC-001 | Реализовать rBAC with CASL | TODO | Не начато | Реализация: 4 roles (OWNER/ADMIN/MEMBER/VIEWER). CASL abilities. PoliciesGuard. Готово, если: RBAC/CASL политики применяются консистентно по org/team/repo scope, попытка эскалации прав блокируется, а deny-решения покрыты e2e тестами; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-SEC-002 | Реализовать secret encryption (AES-GCM) | TODO | Не начато | Реализация: AES-256-GCM. Versioned format. Key rotation ready. Готово, если: секреты шифруются AES-256-GCM с versioned envelope, дешифрование несовместимых версий обрабатывается безопасной ошибкой, rotation-путь проверен тестами; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-SEC-003 | Реализовать rate limiting middleware | TODO | Не начато | Реализация: Default from env. Per org. 429 with headers. Готово, если: rate limit работает по tenant scope и endpoint policy, корректно возвращает 429 + лимитные headers, и не влияет на соседние tenants; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-SEC-004 | Реализовать request validation (Zod) | TODO | Не начато | Реализация: All endpoints. Type-safe DTOs. Error messages. Готово, если: для API-SEC-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.5.0 — Наблюдаемость

> Error tracking, tracing, metrics. ~70K tokens.

> **Результат версии:** Завершена версия «API v0.5.0 — Observability» в рамках M10; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-OBS-001 | Реализовать sentry error tracking | TODO | Не начато | Реализация: Capture errors with context. Готово, если: для API-OBS-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OBS-002 | Реализовать openTelemetry tracing | TODO | Не начато | Реализация: Distributed tracing. Span context. Готово, если: для API-OBS-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OBS-003 | Реализовать health check endpoints | TODO | Не начато | Реализация: /health, /health/ready, /health/live. Готово, если: для API-OBS-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OBS-005 | Реализовать prometheus metrics | TODO | Не начато | Реализация: HTTP metrics. Custom counters. Готово, если: для API-OBS-005 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.6.0 — Core Контроллерs Part 1

> Health, Reviews, Projects, Analytics. ~100K tokens.

> **Результат версии:** Завершена версия «API v0.6.0 — Core Controllers Part 1» в рамках M10; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-CTRL-009 | Реализовать healthController | TODO | Не начато | Реализация: /health, /health/ready, /health/live. Dependencies check. Готово, если: для API-CTRL-009 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-001 | Реализовать reviewsController | TODO | Не начато | Реализация: List, get, trigger. Filter by status, repo, date. Pagination. Готово, если: для API-CTRL-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-002 | Реализовать projectsController | TODO | Не начато | Реализация: CRUD. Settings, integrations. Graph endpoint. Zod validation. Готово, если: для API-CTRL-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-003 | Реализовать analyticsController | TODO | Не начато | Реализация: DORA, CCR metrics, token usage. Date range. Aggregations. Готово, если: для API-CTRL-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---
