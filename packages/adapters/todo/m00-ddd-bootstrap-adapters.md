# M00 — DDD Bootstrap (Adapters)

> Источник: `docs/ddd/sprint-1-ddd-bootstrap.md`

> **Задач:** 4 | **Фокус:** ACL contract tests + messaging idempotency adapters

> **Результат milestone:** внешние интеграции валидируются как ACL-контракты, а messaging получает минимальный идемпотентный контур.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|---|---|---|---|---|
| DDD-S1-008 | Реализовать ACL adapter contract tests для Git (external -> domain DTO) | TODO | Не начато | Реализация: контрактные тесты на mapping, error normalization, retry/idempotency expectations. Готово, если: внешние SDK-типы не просачиваются в core DTO, тесты покрывают happy/429/5xx/partial data, regression suite стабильна; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DDD-S1-009 | Реализовать ACL adapter contract tests для LLM | TODO | Не начато | Реализация: проверки request/response normalization, token/cost fields, fallback behavior. Готово, если: единый доменный формат ответа соблюдается для минимум 2 провайдеров, edge-cases покрыты тестами; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DDD-S1-010 | Реализовать ACL adapter contract tests для Context provider (Jira/Linear one-of) | TODO | Не начато | Реализация: валидация маппинга issue fields/sprint/status в доменные DTO. Готово, если: обязательные поля нормализованы, невалидные внешние данные не ломают доменную модель, контрактные тесты зелёные; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| DDD-S1-011 | Реализовать `OutboxWriter` + `InboxDeduplicator` adapters (минимум) | TODO | Не начато | Реализация: запись outbox-сообщений и проверка idempotency по message key. Готово, если: duplicate processing предотвращается, retry не ломает консистентность, unit/integration тесты подтверждают поведение; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
