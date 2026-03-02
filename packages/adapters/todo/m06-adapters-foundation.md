# M06 — Adapters Foundation

> Источник: `packages/adapters/TODO.md`

> **Задач:** 25 | **Проверка:** `cd packages/adapters && bun test` — DB, messaging, worker infra

> **Результат milestone:** Готов инфраструктурный фундамент adapters: database, messaging и worker-infra.

## Git v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Git v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| GIT-000 | Реализовать базовую структуру пакета | DONE | Реализованы IoC tokens + `registerGitModule`, barrel export и integration-тесты регистрации; git ACL контракты покрывают happy/failure/idempotency. | Реализация: Package.json, tsconfig.json, tsconfig.build.json, IoC module, barrel export. Сборка проходит успешно. Готово, если: для GIT-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## LLM v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «LLM v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| LLM-000 | Реализовать базовую структуру пакета | DONE | Реализованы IoC tokens + `registerLlmModule`, barrel export, fallback policy wiring и integration-тесты регистрации; ACL suite покрывает OpenAI/Anthropic happy/failure/fallback. | Реализация: Package.json, tsconfig.json, tsconfig.build.json, IoC module, barrel export. Сборка проходит успешно. Готово, если: для LLM-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Context v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Context v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CTX-000 | Реализовать базовую структуру пакета | DONE | Реализованы IoC tokens + `registerContextModule`, barrel export и integration-тесты регистрации; Jira ACL контракты покрывают mapping и invalid payload сценарии. | Реализация: Package.json, tsconfig.json, tsconfig.build.json, IoC module, barrel export. Сборка проходит успешно. Готово, если: для CTX-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Notifications v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Notifications v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| NOTIF-000 | Реализовать базовую структуру пакета | DONE | Реализованы `NOTIFICATIONS_TOKENS`, `registerNotificationsModule`, barrel export и in-memory dispatcher adapter с контрактными тестами (deterministic idempotency/validation). | Реализация: Package.json, tsconfig.json, tsconfig.build.json, IoC module, barrel export. Сборка проходит успешно. Готово, если: для NOTIF-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «AST v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-000 | Реализовать базовую структуру пакета | DONE | Реализованы `AST_TOKENS`, `registerAstModule`, barrel export и regex parser adapter с контрактными тестами (TS/JS parsing, валидации, корректные line numbers). | Реализация: Package.json, tsconfig.json, tsconfig.build.json, IoC module, barrel export. Сборка проходит успешно. Готово, если: для AST-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Messaging v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Messaging v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| MSG-000 | Реализовать базовую структуру пакета | DONE | Реализованы IoC tokens + `registerMessagingModule`, barrel export и integration-тесты регистрации; минимальные Outbox/Inbox adapters покрыты idempotency/retry тестами. | Реализация: Package.json, tsconfig.json, tsconfig.build.json, IoC module, barrel export. Сборка проходит успешно. Готово, если: для MSG-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Worker v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Worker v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WORKER-000 | Реализовать базовую структуру пакета | DONE | Реализованы `WORKER_TOKENS`, `registerWorkerModule`, barrel export, in-memory queue/processor registry adapters и тесты регистрации/поведения (FIFO, duplicate, type filter). | Реализация: Package.json, tsconfig.json, tsconfig.build.json, IoC module, barrel export. Сборка проходит успешно. Готово, если: для WORKER-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## База данных v0.1.0 — Package Foundation & Core Adapters

> Каркас пакета, подключение MongoDB, схемы, репозитории, адаптеры и IoC-модуль.

> **Результат версии:** Завершена версия «Database v0.1.0 — Package Foundation & Core Adapters» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| DB-001 | Реализовать каркас пакета | DONE | Добавлен foundation `src/database` (contracts, errors, tokens, index), подключён экспорт в root barrel и тестовый контур для database-модуля. | Реализация: Package.json, tsconfig, eslint, prettier, bunfig. Сборка проходит успешно. Готово, если: для DB-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DB-002 | Реализовать MongoConnectionManager | DONE | Реализован `MongoConnectionManager` с `connect()/disconnect()/getConnection()/isConnected()`, injectable `createConnectionFn`, нормализованными error-кодами и покрытием 9 тестами. | Реализация: Connect(), disconnect(), getConnection(), isConnected(). Injectable createConnectionFn для тестов. 9 тестов. Готово, если: для DB-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DB-003 | Реализовать Mongoose-схемы | TODO | Не начато | Реализация: 10 schemas извлечены из api: Review, Task, Rule, RuleCategory, PromptTemplate, PromptConfiguration, ExpertPanel, ReviewIssueTicket, SystemSettings, Organization. Готово, если: для DB-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DB-004 | Реализовать MongoDB repository adapters | TODO | Не начато | Реализация: 9 plain-class адаптеров с constructor injection (Model + Фабрика). Реализуют порты из core. Готово, если: для DB-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DB-005 | Реализовать адаптеры категории D | TODO | Не начато | Реализация: AllowAllAuthService (MVP), MongoOrganizationConfigLoader, DefaultRepositoryConfigLoader. 4 теста. Готово, если: для DB-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DB-006 | Реализовать registerDatabaseModule | TODO | Не начато | Реализация: IoC wiring: 10 factories + 11 repositories + 3 adapters. DATABASE_TOKENS. Barrel export index.ts. 4 integration теста. Готово, если: для DB-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Messaging v0.1.0 — Outbox Pattern

> Outbox repository + relay service. ~50K tokens.

> **Результат версии:** Завершена версия «Messaging v0.1.0 — Outbox Pattern» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| MSG-001 | Реализовать OutboxRepositoryImpl | TODO | Не начато | Реализация: MongoDB outbox repository. Готово, если: outbox repository сохраняет событие атомарно с бизнес-транзакцией, relay читает события пакетно и не публикует дубликаты при повторном запуске; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| MSG-002 | Реализовать outboxRelayServiceImpl | TODO | Не начато | Реализация: Outbox message relay implementation. Готово, если: relay service соблюдает retry/backoff политику, помечает permanently failed события и не блокирует очередь при единичных ошибках брокера; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Messaging v0.2.0 — Inbox Pattern

> Inbox repository + deduplication. ~50K tokens.

> **Результат версии:** Завершена версия «Messaging v0.2.0 — Inbox Pattern» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| MSG-003 | Реализовать InboxRepositoryImpl | TODO | Не начато | Реализация: MongoDB inbox repository. Готово, если: inbox repository обеспечивает exactly-once семантику на уровне messageId/consumerId, повторный ingest не запускает повторную обработку; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| MSG-004 | Реализовать inboxDeduplicationImpl | TODO | Не начато | Реализация: Inbox deduplication implementation. Готово, если: deduplication корректно различает новый и повторный payload, работает при конкурентной обработке и не даёт race-condition дублей; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Worker v0.1.0 — Базовые компоненты

> BullMQ worker and job queue foundation. ~80K tokens.

> **Результат версии:** Завершена версия «Worker v0.1.0 — Core Components» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WORKER-001 | Реализовать bullMQ worker implementation | TODO | Не начато | Реализация: Prefetch 1. Graceful shutdown 30s. Health-check проверки. Готово, если: worker стабильно обрабатывает jobs при prefetch=1, graceful shutdown завершает активные jobs в окне 30s и не теряет подтверждённые результаты; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-002 | Реализовать задача queue service | TODO | Не начато | Реализация: Enqueue, dequeue, status. Priority support. Готово, если: для WORKER-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-003 | Реализовать processor registry | TODO | Не начато | Реализация: Register processors by job type. Lookup by name. Готово, если: для WORKER-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-004 | Реализовать base processor class | TODO | Не начато | Реализация: Process(job), onFailed(job, error). Logging. Metrics. Готово, если: для WORKER-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Worker v0.2.0 — Инфраструктура

> Redis handling, shutdown, and logging. ~80K tokens.

> **Результат версии:** Завершена версия «Worker v0.2.0 — Infrastructure» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WORKER-INFRA-002 | Реализовать redis connection handling | TODO | Не начато | Реализация: Пул подключений. Переподключение с backoff. Health-check проверки. Готово, если: redis reconnect с backoff восстанавливает работу без ручного вмешательства, transient network failure не приводит к потере queued jobs; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-INFRA-003 | Реализовать graceful shutdown | TODO | Не начато | Реализация: SIGTERM handling. Wait 30s for active jobs. Force kill if timeout. Готово, если: shutdown корректно обрабатывает SIGTERM: новые jobs не принимаются, активные завершаются или переводятся в retry по таймауту; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-INFRA-005 | Реализовать pino logging integration | TODO | Не начато | Реализация: Структурированный JSON-формат. Поддержка correlation ID. Задача context. Готово, если: для WORKER-INFRA-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-INFRA-001 | Реализовать DLQ configuration | TODO | Не начато | Реализация: After 5 attempts. Manual retry API. Alerts on DLQ entry. Готово, если: после исчерпания retry job уходит в DLQ с полной диагностикой, manual retry возвращает job в рабочую очередь без потери контекста; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---
