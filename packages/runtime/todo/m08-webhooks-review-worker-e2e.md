# M08 — Webhooks & Review Worker E2E

> Источник: `packages/runtime/TODO.md`

> **Задач:** 32 | **Проверка:** GitHub webhook → queue → pipeline → комментарии в PR

> **Результат milestone:** Готов e2e поток webhook -> очередь -> pipeline -> комментарии в MR/PR.

## Webhooks v0.0.0 — Базовая структура пакета

> Базовая инфраструктура, IoC-модуль и barrel export.

> **Результат версии:** Завершена версия «Webhooks v0.0.0 — Package Foundation» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WH-000 | Реализовать базовую структуру пакета | TODO | Не начато | Реализация: Package.json, tsconfig.json, tsconfig.build.json, IoC module, barrel export. Сборка проходит успешно. Готово, если: для WH-000 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Webhooks v0.1.0 — Базовые компоненты

> Базовый обработчик и валидация. ~60K tokens.

> **Результат версии:** Завершена версия «Webhooks v0.1.0 — Core Components» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WH-001 | Реализовать base handler class | TODO | Не начато | Реализация: ParseEvent(), validate(), route(). Возвращает 202 immediately. Готово, если: для WH-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-002 | Реализовать webhook signature verification | TODO | Не начато | Реализация: HMAC-SHA256 for GitHub/Bitbucket. Token for GitLab. Готово, если: для WH-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-003 | Реализовать event type validation | TODO | Не начато | Реализация: Check supported events. Возвращает 400 for unsupported. Готово, если: для WH-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Webhooks v0.2.0 — Безопасность

> Подпись, rate limiting и идемпотентность. ~80K tokens.

> **Результат версии:** Завершена версия «Webhooks v0.2.0 — Security» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WH-SEC-001 | Реализовать signature verification (HMAC) | TODO | Не начато | Реализация: HMAC-SHA256 compare. 401 on mismatch. Сравнение через timing-safe compare. Готово, если: подпись проверяется timing-safe сравнением, неверная подпись всегда даёт 401 без enqueue, валидная подпись допускает обработку по happy-path; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-SEC-002 | Реализовать request body size limits | TODO | Не начато | Реализация: Max 25MB. 413 on exceed. Готово, если: для WH-SEC-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-SEC-003 | Реализовать rate limiting | TODO | Не начато | Реализация: Per org, per repo. 429 on exceed. Headers: X-RateLimit-*. Готово, если: rate limiting срабатывает по org/repo ключу, при превышении стабильно возвращается 429 с корректными X-RateLimit заголовками и без деградации соседних tenants; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-SEC-004 | Реализовать timestamp validation | TODO | Не начато | Реализация: Reject if timestamp > 5min old. Prevent replay attacks. Готово, если: replay-защита блокирует устаревшие запросы (>5 минут) и допускает валидные в окне допуска с учётом clock skew, покрыты граничные значения времени; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-SEC-005 | Реализовать idempotency handling | TODO | Не начато | Реализация: Check event ID in inbox. Skip if already processed. Готово, если: идемпотентность подтверждена: повторный eventId не приводит к повторному enqueue/обработке, первичный запрос обрабатывается ровно один раз; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Webhooks v0.3.0 — Инфраструктура

> Валидация схем, логирование и метрики. ~50K tokens.

> **Результат версии:** Завершена версия «Webhooks v0.3.0 — Infrastructure» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WH-INFRA-001 | Реализовать zod schema validation | TODO | Не начато | Реализация: Validate webhook payloads. Готово, если: для WH-INFRA-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-INFRA-002 | Реализовать pino logging integration | TODO | Не начато | Реализация: Structured JSON logging. Готово, если: для WH-INFRA-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-INFRA-003 | Реализовать metrics collection | TODO | Не начато | Реализация: Prometheus metrics for webhooks. Готово, если: для WH-INFRA-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Webhooks v0.4.0 — Platform Handlers

> GitHub, GitLab, Azure DevOps, Bitbucket handlers. ~100K tokens.

> **Результат версии:** Завершена версия «Webhooks v0.4.0 — Platform Handlers» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WH-HANDLER-001 | Реализовать gitHub webhook handler | TODO | Не начато | Реализация: Pull_request (opened/synchronize/reopened), issue_comment, review_comment. Готово, если: для WH-HANDLER-001 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-HANDLER-002 | Реализовать gitLab webhook handler | TODO | Не начато | Реализация: Merge Request Hook, Note Hook for comments. Готово, если: для WH-HANDLER-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-HANDLER-003 | Реализовать azure DevOps webhook handler | TODO | Не начато | Реализация: Git.pullrequest.created, git.pullrequest.updated. Готово, если: для WH-HANDLER-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| WH-HANDLER-004 | Реализовать bitbucket webhook handler | TODO | Не начато | Реализация: Pullrequest:created/updated, pullrequest:comment_created. Готово, если: для WH-HANDLER-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Review Worker v0.0.0 — Базовая структура пакета

> Package setup, configs, barrel export.

> **Результат версии:** Завершена версия «Review Worker v0.0.0 — Package Foundation» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| REVW-000 | Реализовать базовую структуру пакета | TODO | Не начато | Реализация: Package.json, tsconfig.json, tsconfig.build.json, IoC module, barrel export. Сборка проходит успешно. Готово, если: для REVW-000 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Review Worker v0.1.0 — Code Review Processor

> Main code review job processor. ~60K tokens.

> **Результат версии:** Завершена версия «Review Worker v0.1.0 — Code Review Processor» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| REVW-001 | Реализовать code review processor | TODO | Не начато | Реализация: Executes 20-stage pipeline. 15min timeout. Parallel files (30). Готово, если: 20-stage pipeline выполняется в worker end-to-end на реальном payload, при timeout/исключениях задача переводится в корректный terminal state с retry/DLQ политикой; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Review Worker v0.2.0 — Task Processing

> Async task execution and tracking. ~70K tokens.

> **Результат версии:** Завершена версия «Review Worker v0.2.0 — Task Processing» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| REVW-002 | Реализовать taskProcessor | TODO | Не начато | Реализация: Process async tasks from queue. Готово, если: для REVW-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-003 | Реализовать taskProgressEmitter | TODO | Не начато | Реализация: Emit task progress updates. Готово, если: для REVW-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-004 | Реализовать taskResultWriter | TODO | Не начато | Реализация: Write task results to storage. Готово, если: для REVW-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-005 | Реализовать taskTimeoutHandler | TODO | Не начато | Реализация: Handle task timeouts gracefully. Готово, если: для REVW-005 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Review Worker v0.3.0 — BullMQ Consumer & DI

> Job consumer, pipeline orchestrator, Container DI wiring. ~80K tokens.

> **Результат версии:** Завершена версия «Review Worker v0.3.0 — BullMQ Consumer & DI» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| REVW-006 | Реализовать reviewJobConsumer | TODO | Не начато | Реализация: Покрыт REVW-001: ReviewTriggerProcessor extends BaseJobProcessor, обрабатывает review.trigger. Retry/DLQ через worker-infra. Готово, если: consumer корректно читает review.trigger, подтверждает успешные задачи и не ack-ает неуспешные до исчерпания retry, после чего отправляет в DLQ; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-007 | Реализовать reviewPipelineOrchestrator | TODO | Не начато | Реализация: Покрыт REVW-001: маппинг payload → PipelineContext, вызов PipelineRunnerUseCase, обработка stage errors. Готово, если: для REVW-007 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-008 | Реализовать reviewWorkerContainer | TODO | Не начато | Реализация: IoC tokens, registerReviewWorkerModule: domain services, task use cases, task services, review stage deps, 21 stages, PipelineRunner, processor. Готово, если: для REVW-008 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-009 | Реализовать reviewWorkerEntrypoint | TODO | Не начато | Реализация: Main.ts: env validation (Zod), Container setup, real provider/DB bindings (replaced placeholders), graceful shutdown, health check (Bun.serve), BullMQ consumer. Готово, если: для REVW-009 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Review Worker v0.4.0 — Result Publishing

> Публикация результатов review в Git-платформу и очереди. ~60K tokens.

> **Результат версии:** Завершена версия «Review Worker v0.4.0 — Result Publishing» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| REVW-010 | Реализовать resultPublisher | TODO | Не начато | Реализация: LocalEventBus (in-process IEventBus), ReviewCompletedHandler → enqueue notify.send + analytics.metrics через BullMQJobQueueAdapter. Partial failure. 9 тестов. Готово, если: для REVW-010 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-011 | Реализовать reviewCommentWriter | TODO | Не начато | Реализация: Покрыт core stages: CreateCcrLevelCommentsStage (stage 12) + CreateFileCommentsStage (stage 14). Batching и update-on-re-review — future enhancement в core. Готово, если: для REVW-011 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-012 | Реализовать reviewStatusUpdater | TODO | Не начато | Реализация: Покрыт core stages: RequestChangesOrApproveStage (stage 18) + FinalizeCheckStage (stage 19). Approve/requestChanges + updateCheckRun. Готово, если: для REVW-012 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Review Worker v0.4.0.1 — End-to-End Pipeline Wiring

> Замена 15 placeholder портов реальными bindings. Подключение @codenautic/database, git-providers, llm-providers.

> **Результат версии:** Завершена версия «Review Worker v0.4.0.1 — End-to-End Pipeline Wiring» в рамках M08; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| REVW-020 | Реализовать база данных module integration | TODO | Не начато | Реализация: registerDatabaseModule() биндит 11 repo + 10 factories + 3 adapters. Env: MONGODB_URI. Тесты (17 в database, 4 integration). Готово, если: для REVW-020 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-021 | Реализовать провайдер module integration | TODO | Не начато | Реализация: registerGitProvidersModule() + registerLlmProvidersModule(). Env: GIT_PLATFORM, GIT_ACCESS_TOKEN, LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, LLM_BASE_URL. Тесты env schema. Готово, если: для REVW-021 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| REVW-022 | Реализовать use cases + main.ts rewrite | TODO | Не начато | Реализация: RegisterUseCases() (6 use cases). bindPlaceholderPorts() удалён полностью. NoOpCommentTracker для CreateFileCommentsStage. 79 тестов зелёные. Готово, если: для REVW-022 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---
