# M07 — API Foundation

> Источник: `packages/runtime/TODO.md`

> **Задач (runtime):** 14 | **Проверка:** `bun run dev:api` стартует, health endpoint, admin CRUD

> **Результат milestone:** Готов API foundation и управляемая точка входа продукта.

## API v0.1.0 — Базовая конфигурация

> Environment validation and config. ~60K tokens.

> **Результат версии:** Завершена версия «API v0.1.0 — Foundation» в рамках M07; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-CFG-001 | Реализовать валидацию окружения | DONE | Реализовано | Реализация: Проверка всех обязательных переменных окружения. Готово, если: env schema валидирует обязательные/опциональные переменные и завершает старт fail-fast с понятной диагностикой, при валидной конфигурации API стартует без предупреждений; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CFG-002 | Реализовать модуль конфигурации | DONE | Реализовано | Реализация: Загрузка и валидация конфигурации. Готово, если: для API-CFG-002 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-DB-001 | Реализовать MongoDB connection | DONE | Реализовано | Реализация: Подключение к базе с retry и управлением пулом. Готово, если: подключение к Mongo использует retry/backoff и корректно сигнализирует readiness, при недоступной БД API не входит в ready-state и не принимает write-запросы; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-OBS-004 | Реализовать Pino structured logging | TODO | Не начато | Реализация: Структурированное JSON-логирование и корреляция запросов. Готово, если: для API-OBS-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

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
