# M07 — API Foundation

> Источник: `packages/runtime/TODO.md`

> **Задач (runtime):** 24 | **Проверка:** `bun run dev:api` и `bun run dev:settings-service` стартуют, health endpoint, admin CRUD

> **Результат milestone:** Готов API foundation и управляемая точка входа продукта.

## API v0.1.0 — Базовая конфигурация

> Environment validation and config. ~60K tokens.

> **Результат версии:** Завершена версия «API v0.1.0 — Foundation» в рамках M07; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-CFG-001 | Реализовать валидацию окружения | DONE | Реализовано | Реализация: Проверка всех обязательных переменных окружения. Готово, если: env schema валидирует обязательные/опциональные переменные и завершает старт fail-fast с понятной диагностикой, при валидной конфигурации API стартует без предупреждений; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CFG-002 | Реализовать модуль конфигурации | TODO | Не начато | Реализация: Загрузка и валидация конфигурации. Готово, если: для API-CFG-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-DB-001 | Реализовать MongoDB connection | TODO | Не начато | Реализация: Подключение к базе с retry и управлением пулом. Готово, если: подключение к Mongo использует retry/backoff и корректно сигнализирует readiness, при недоступной БД API не входит в ready-state и не принимает write-запросы; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OBS-004 | Реализовать Pino structured logging | TODO | Не начато | Реализация: Структурированное JSON-логирование и корреляция запросов. Готово, если: для API-OBS-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Settings Service v0.1.0 — Config Registry Foundation

> Runtime process для поставки defaults и конфигурационных ресурсов. ~45K tokens.

> **Результат версии:** Завершена версия «Settings Service v0.1.0 — Config Registry Foundation» в рамках M07; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| SETSVC-001 | Реализовать валидацию окружения settings-service | TODO | Не начато | Реализация: Zod-валидация `NODE_ENV`, `SETTINGS_SERVICE_HOST`, `SETTINGS_SERVICE_PORT`, `SETTINGS_SERVICE_HEALTHCHECK_ENABLED`, `SETTINGS_SERVICE_DEFAULTS_DIR`, `SETTINGS_SERVICE_FILE_PATH`. Готово, если: конфигурация валидируется fail-fast с диагностикой и дефолтами, а невалидные значения блокируют старт процесса; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SETSVC-002 | Реализовать модуль конфигурации settings-service | TODO | Не начато | Реализация: `SettingsServiceConfigModule` с merge overrides и нормализацией абсолютных путей defaults/settings файла. Готово, если: модуль возвращает иммутабельные снапшоты и отклоняет невалидные значения на этапе инициализации; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SETSVC-003 | Реализовать bootstrap settings-service на NestJS | TODO | Не начато | Реализация: composition root `startSettingsService()` + `main.ts` entrypoint, запуск на host/port из validated config. Готово, если: процесс стартует/останавливается программно и корректно использует runtime-конфиг без прямого доступа к raw env; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SETSVC-004 | Реализовать HTTP controller для конфигурационных endpoint-ов | TODO | Не начато | Реализация: `GET /health`, `GET /configs`, `GET /configs/:resource`, `GET /configs/settings`, `GET /configs/settings/:key` с 400/404 ветками. Готово, если: health учитывает feature-toggle, пустые ключи/ресурсы валидируются, а неизвестные ресурсы возвращают детерминированный 404; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SETSVC-005 | Реализовать settings-service с файловым кешированием | TODO | Не начато | Реализация: загрузка `settings.json` и ресурсов defaults, cache по `lastModified`, валидация payload (shape/duplicates/missing value). Готово, если: повторные чтения не приводят к лишнему IO при неизменном файле, а повреждённые payload блокируются с явной ошибкой; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## Settings Client v0.1.0 — Runtime Integration

> Клиент и адаптеры для потребления settings-service из runtime-процессов. ~45K tokens.

> **Результат версии:** Завершена версия «Settings Client v0.1.0 — Runtime Integration» в рамках M07; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| SETCLI-001 | Реализовать валидацию окружения settings-client | TODO | Не начато | Реализация: Zod-валидация `SETTINGS_SERVICE_URL` и `SETTINGS_SERVICE_TIMEOUT_MS` с дефолтами. Готово, если: невалидный URL/timeout блокирует инициализацию клиента, а валидная конфигурация создаётся детерминированно; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SETCLI-002 | Реализовать модуль конфигурации settings-client | TODO | Не начато | Реализация: `SettingsServiceClientConfigModule` с merge overrides и снапшотами config. Готово, если: модуль поддерживает тестовые overrides без мутаций исходной конфигурации и проверяет инварианты timeout/baseUrl; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SETCLI-003 | Реализовать HTTP client для settings-service | TODO | Не начато | Реализация: `SettingsServiceClient` (`getSetting`, `getOptionalSetting`, `getSettingsSnapshot`, `getConfigResource`) с timeout через `AbortController` и typed error (`SettingsServiceClientError`). Готово, если: 404 может обрабатываться как optional-path, transport/status ошибки нормализуются, а API не возвращает сырой `fetch` error наружу; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SETCLI-004 | Реализовать loader defaults в `IApplicationDefaultsDTO` | TODO | Не начато | Реализация: `SettingsDefaultsLoader` собирает review/messaging/rules/analytics/clustering/mcp defaults через per-key Zod schemas. Готово, если: отсутствующие/невалидные ключи дают детерминированный `SettingsDefaultsValidationError`, а валидный snapshot маппится в полный `IApplicationDefaultsDTO`; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| SETCLI-005 | Реализовать `ISystemSettingsProvider` adapter на settings-client | TODO | Не начато | Реализация: `SettingsServiceSystemSettingsProvider` (`get`, `getMany`) с безопасной обработкой отсутствующих ключей. Готово, если: адаптер возвращает только существующие значения, не падает на пустом входе и корректно работает с полным snapshot; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---

## API v0.2.0 — Database Infrastructure & Admin Module

> MongoDB schemas, repositories, admin CRUD endpoints. ~80K tokens.

> **Результат версии:** Завершена версия «API v0.2.0 — Database Infrastructure & Admin Module» в рамках M07; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-DB-002 | Реализовать MongoDB schemas | TODO | Не начато | Реализация: Mongoose-схемы для 5 сущностей. Готово, если: для API-DB-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-DB-003 | Реализовать MongoDB repositories | TODO | Не начато | Реализация: Репозиторий pattern: 5 репозиториев с тестами. Готово, если: для API-DB-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-ADM-001 | Реализовать admin API key guard | TODO | Не начато | Реализация: X-Admin-API-Key header. Сравнение через timing-safe compare. 401/403. Готово, если: admin guard использует timing-safe compare и multi-tenant проверку прав, неверный ключ всегда возвращает 401/403 без утечки деталей авторизации; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-ADM-002 | Реализовать admin CategoriesController | TODO | Не начато | Реализация: CRUD для категорий правил. Zod validation. Готово, если: для API-ADM-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-ADM-003 | Реализовать admin RulesController | TODO | Не начато | Реализация: CRUD для правил. Zod validation. Готово, если: для API-ADM-003 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-ADM-004 | Реализовать admin SettingsController | TODO | Не начато | Реализация: CRUD для системных настроек. Zod validation. Готово, если: для API-ADM-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-ADM-005 | Реализовать admin PromptsController | TODO | Не начато | Реализация: CRUD для prompt-шаблонов. Zod validation. Готово, если: для API-ADM-005 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-ADM-006 | Реализовать admin ExpertPanelsModule | TODO | Не начато | Реализация: Schema, repository, module для экспертных панелей. Готово, если: для API-ADM-006 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-ADM-007 | Реализовать admin ImportController | TODO | Не начато | Реализация: Bulk-импорт для всех 5 сущностей. Zod validation. Готово, если: bulk import выполняется идемпотентно, частичные ошибки возвращаются поэлементно без отката успешных записей, повторный импорт не создаёт дубликаты; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CACHE-001 | Реализовать redis cache adapter | TODO | Не начато | Реализация: Get, set, delete with TTL. Готово, если: cache adapter соблюдает TTL и инвалидацию, при недоступном Redis API деградирует в безопасный режим без падения критичных endpoint; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---
