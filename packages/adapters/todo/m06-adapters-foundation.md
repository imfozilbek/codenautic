# M06 — Adapters Foundation

> Источник: `packages/adapters/TODO.md`

> **Задач:** 25 | **Проверка:** `cd packages/adapters && bun test` — DB, messaging, worker infra

> **Результат milestone:** Готов инфраструктурный фундамент adapters: database, messaging и worker-infra.

## Git v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Git v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| GIT-000 | Реализовать базовую структуру пакета | DONE | Реализовано | Реализация: Сформирован git-domain foundation: `git.module.ts`, `git.tokens.ts`, `git-provider.factory.ts`, ACL слой и полный barrel export из `src/git/index.ts` и `src/index.ts`. Готово, если: для GIT-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## LLM v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «LLM v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| LLM-000 | Реализовать базовую структуру пакета | DONE | Реализовано | Реализация: Сформирован llm-domain foundation: `llm.module.ts`, `llm.tokens.ts`, `llm-provider.factory.ts`, ACL normalizers и barrel export из `src/llm/index.ts` и `src/index.ts`. Готово, если: для LLM-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Context v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Context v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CTX-000 | Реализовать базовую структуру пакета | DONE | Реализовано | Реализация: Добавлены context-domain IoC foundation элементы: `context.module.ts`, `context.tokens.ts`, обновлены barrel exports и DI-покрытие в foundation-тестах для регистрации default provider в adapters/core токены. Готово, если: для CTX-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Notifications v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Notifications v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| NOTIF-000 | Реализовать базовую структуру пакета | DONE | Реализовано | Реализация: Сформирован notifications-domain foundation: `notifications.module.ts`, `notifications.tokens.ts`, provider factory и barrel export из `src/notifications/index.ts` и `src/index.ts`. Готово, если: для NOTIF-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## AST v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «AST v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-000 | Реализовать базовую структуру пакета | DONE | Реализовано | Реализация: Добавлены AST foundation-артефакты `ast.module.ts` и `ast.tokens.ts`, обновлены barrel exports и DI-тесты биндинга parser/graph/vector/page-rank сервисов в adapters/core токены. Готово, если: для AST-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Messaging v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Messaging v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| MSG-000 | Реализовать базовую структуру пакета | DONE | Реализовано | Реализация: Добавлены messaging foundation-артефакты `messaging.module.ts` и `messaging.tokens.ts`, обновлены barrel exports и DI-тесты регистрации `OutboxWriter` и `InboxDeduplicator` через adapters-токены. Готово, если: для MSG-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Worker v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Worker v0.0.0 — Package Foundation» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WORKER-000 | Реализовать базовую структуру пакета | DONE | Реализовано | Реализация: Добавлен базовый worker foundation: `src/worker` с контрактами, `worker.tokens.ts`, `worker.module.ts`, barrel exports и DI-тестами регистрации queue/registry/runtime адаптеров. Готово, если: для WORKER-000 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## База данных v0.1.0 — Package Foundation & Core Adapters

> Каркас пакета, подключение MongoDB, схемы, репозитории, адаптеры и IoC-модуль.

> **Результат версии:** Завершена версия «Database v0.1.0 — Package Foundation & Core Adapters» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| DB-001 | Реализовать каркас пакета | DONE | Реализовано | Реализация: Добавлен database foundation-контур `src/database` (`database.types.ts`, `database.tokens.ts`, `database.module.ts`, `index.ts`) и тест регистрации `registerDatabaseModule` через `DATABASE_TOKENS.ConnectionManager`; root barrel обновлён. Готово, если: для DB-001 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DB-002 | Реализовать MongoConnectionManager | DONE | Реализовано | Реализация: Добавлен `MongoConnectionManager` с контрактом `connect()/disconnect()/getConnection()/isConnected()`, поддержкой injectable `createConnectionFn/closeConnectionFn`, idempotent connect с coalescing параллельных вызовов и проверенным failure-path. Покрыто 9 целевыми тестами `mongo-connection-manager.test.ts`. Готово, если: для DB-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DB-003 | Реализовать Mongoose-схемы | DONE | Реализовано | Реализация: Добавлен пакет `src/database/schemas` с 10 схемами (Review, Task, Rule, RuleCategory, PromptTemplate, PromptConfiguration, ExpertPanel, ReviewIssueTicket, SystemSettings, Organization), индексами под query-контракты репозиториев и общим экспортом через `src/database/index.ts`; добавлены тесты `tests/database/database-schemas.test.ts` на коллекции/индексы/базовые поля. Готово, если: для DB-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DB-004 | Реализовать MongoDB repository adapters | DONE | Реализовано | Реализация: Добавлены 9 plain-class Mongo adapters с constructor injection (`model + factory`) в `src/database/repositories`: Review, Task, Rule, RuleCategory, PromptTemplate, PromptConfiguration, ExpertPanel, ReviewIssueTicket, Organization. Репозитории реализуют соответствующие core-порты, вынесен общий контракт `IMongoModel/IMongoRepositoryFactory`, добавлены unit-тесты `tests/database/mongo-repositories.test.ts` на фильтры/fallback/upsert/scoping. Готово, если: для DB-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DB-005 | Реализовать адаптеры категории D | DONE | Реализовано | Реализация: Добавлены `AllowAllAuthService` (MVP allow-all), `MongoOrganizationConfigLoader` (organization/team layer из Mongo settings) и `DefaultRepositoryConfigLoader` (default/repo layers из system settings + delegation organization layer) в `src/database/adapters`; вынесена нормализация review-config (`review-config-layer-normalizer.ts`). Добавлены 4 unit-теста `tests/database/database-category-d-adapters.test.ts`. Готово, если: для DB-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DB-006 | Реализовать registerDatabaseModule | DONE | Реализовано | Реализация: Расширен `registerDatabaseModule` до полного IoC-wiring слоя database: `DATABASE_TOKENS` дополнили группами `Factories` (10), `Repositories` (11), `Adapters` (3); добавлены экспортируемые контракты `IDatabaseModuleFactories/Repositories/Adapters`, dual-binding в core `TOKENS` (review/rule/task/prompt/organization/system-settings/repository-config-loader) и optional registration для composition roots. Добавлен `MongoSystemSettingsRepository` + barrel export, root/index экспорты обновлены. Добавлены 4 integration-теста `tests/database/database-module.test.ts` и расширены repository-тесты (`mongo-system-settings`). Готово, если: для DB-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Messaging v0.1.0 — Outbox Pattern

> Outbox repository + relay service. ~50K tokens.

> **Результат версии:** Завершена версия «Messaging v0.1.0 — Outbox Pattern» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| MSG-001 | Реализовать OutboxRepositoryImpl | DONE | Реализовано | Реализация: Добавлен `MongoOutboxRepository` (`src/messaging/mongo-outbox-repository.adapter.ts`) как реализация `IOutboxRepository`: `save/findById/findPending/markSent/markFailed`, пакетная выборка pending с limit+sort и корректные retry/status переходы через доменный `OutboxMessage`. Обновлены `MESSAGING_TOKENS` и `registerMessagingModule` (optional binding `OutboxRepository` + bridge в `TOKENS.Messaging.OutboxRepository`), обновлены barrel exports (`src/messaging/index.ts`, `src/index.ts`). Добавлены тесты `tests/messaging/mongo-outbox-repository.test.ts` и расширен foundation wiring test. Готово, если: outbox repository сохраняет событие атомарно с бизнес-транзакцией, relay читает события пакетно и не публикует дубликаты при повторном запуске; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| MSG-002 | Реализовать outboxRelayServiceImpl | DONE | Реализовано | Реализация: Добавлен `OutboxRelayServiceImpl` (`src/messaging/outbox-relay-service.impl.ts`) с retry/backoff политикой (batch size, maxAttemptsPerRun, initialBackoffMs, backoffMultiplier, injectable sleep), корректной обработкой retriable/permanently failed сообщений и неблокирующей обработкой батча (ошибка одной записи не прерывает остальные). Обновлены `MESSAGING_TOKENS` (`OutboxRelayService`) и `registerMessagingModule` (optional binding relay/repository), расширены barrel exports. Добавлены тесты `tests/messaging/outbox-relay-service-impl.test.ts`, обновлён foundation wiring тест. Готово, если: relay service соблюдает retry/backoff политику, помечает permanently failed события и не блокирует очередь при единичных ошибках брокера; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Messaging v0.2.0 — Inbox Pattern

> Inbox repository + deduplication. ~50K tokens.

> **Результат версии:** Завершена версия «Messaging v0.2.0 — Inbox Pattern» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| MSG-003 | Реализовать InboxRepositoryImpl | DONE | Реализовано | Реализация: Добавлен `MongoInboxRepository` (`src/messaging/mongo-inbox-repository.adapter.ts`) как реализация `IInboxRepository`: `save/findById/findByMessageId/markProcessed` с upsert-паттерном и обновлением `processedAt`. Расширены `MESSAGING_TOKENS` (`InboxRepository`) и `registerMessagingModule` (optional binding в `TOKENS.Messaging.InboxRepository`), обновлены barrel exports (`src/messaging/index.ts`, `src/index.ts`). Добавлены тесты `tests/messaging/mongo-inbox-repository.test.ts`, расширен foundation wiring тест. Готово, если: inbox repository обеспечивает exactly-once семантику на уровне messageId/consumerId, повторный ingest не запускает повторную обработку; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| MSG-004 | Реализовать inboxDeduplicationImpl | DONE | Реализовано | Реализация: Добавлен `InboxDeduplicationImpl` (`src/messaging/inbox-deduplication.impl.ts`) с контрактом `checkOrMarkProcessed/isDuplicate`: первая обработка помечается как новая, повторная — как duplicate с детерминированным ключом `messageId:consumerId`. Расширены `MESSAGING_TOKENS` (`InboxDeduplication`) и `registerMessagingModule` (optional binding deduplication + bridge в `TOKENS.Messaging.InboxDeduplication`), обновлены barrel exports (`src/messaging/index.ts`, `src/index.ts`). Добавлены тесты `tests/messaging/inbox-deduplication-impl.test.ts`, расширен foundation wiring тест. Готово, если: deduplication корректно различает новый и повторный payload, работает при конкурентной обработке и не даёт race-condition дублей; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Worker v0.1.0 — Базовые компоненты

> BullMQ worker and job queue foundation. ~80K tokens.

> **Результат версии:** Завершена версия «Worker v0.1.0 — Core Components» в рамках M06; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WORKER-001 | Реализовать bullMQ worker implementation | DONE | Реализовано | Реализация: Добавлен `BullMqWorkerRuntime` (`src/worker/bullmq-worker-runtime.impl.ts`) с фиксированным prefetch/concurrency `1`, graceful shutdown c таймаутом 30s и fallback `force close`, а также health-check snapshot (`status/isHealthy/activeJobs/prefetch/lastFailure`). Обновлены worker exports (`src/worker/index.ts`, `src/index.ts`) и контракт `IWorkerRuntime`/`WORKER_RUNTIME_STATUS` в `worker.types.ts`. Добавлены тесты `tests/worker/bullmq-worker-runtime.impl.test.ts` и обновлён foundation wiring тест. Готово, если: worker стабильно обрабатывает jobs при prefetch=1, graceful shutdown завершает активные jobs в окне 30s и не теряет подтверждённые результаты; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| WORKER-002 | Реализовать задача queue service | DONE | Реализовано | Реализация: Добавлен `BullMqQueueService` (`src/worker/bullmq-queue-service.impl.ts`) с операциями `enqueue/dequeue/getStatus`, поддержкой приоритетов (app priority: выше = раньше, с маппингом в BullMQ), нормализацией payload envelope и безопасным маппингом статусов в `WORKER_QUEUE_JOB_STATUS`. Расширен контракт `IWorkerQueueService` (`dequeue`, `getStatus`, `WorkerQueueJobStatus`, `IWorkerDequeuedJob`) и обновлены exports. Добавлены тесты `tests/worker/bullmq-queue-service.impl.test.ts`, обновлён foundation wiring test. Готово, если: для WORKER-002 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
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
