# M09 — Notifications & Context

> Источник: `packages/adapters/TODO.md`

> **Задач (adapters):** 5 | **Проверка:** Slack уведомления, Jira/Linear/Sentry context

> **Результат milestone:** Готов контекст и уведомления для обогащенного ревью и feedback loop.

## Notifications v0.1.0 — Slack Provider

> Factory + Slack implementation. ~60K tokens.

> **Результат версии:** Завершена версия «Notifications v0.1.0 — Slack Provider» в рамках M09; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| NOTIF-001 | Реализовать NotificationProviderFactory | TODO | Не начато | Реализация: Фабрика провайдеров уведомлений. Готово, если: factory маршрутизирует каналы уведомлений в корректный provider, неизвестный канал и misconfiguration обрабатываются типизированной ошибкой без падения worker; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| NOTIF-002 | Реализовать slackProvider | TODO | Не начато | Реализация: Slack Web API + Events API integration. Готово, если: Slack provider гарантирует идемпотентную отправку по dedupe key, корректно обрабатывает 429 с backoff и не теряет сообщения при временной деградации API; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Context v0.1.0 — Core Context Providers

> Jira, Linear, Sentry. ~90K tokens.

> **Результат версии:** Завершена версия «Context v0.1.0 — Core Context Providers» в рамках M09; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CTX-001 | Реализовать JiraProvider | DONE | Реализовано | Реализация: Интеграция через REST API. Ticket description, acceptance criteria, sprint context. Готово, если: Jira ACL маппит поля issue/sprint/acceptance criteria в доменные DTO без потери обязательных данных, покрыты сценарии pagination/rate-limit/permission denied; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| CTX-002 | Реализовать LinearProvider | TODO | Не начато | Реализация: Интеграция через GraphQL. Issue description, sub-issues, project context. Готово, если: Linear ACL корректно обрабатывает GraphQL ошибки и partial data, маппинг статусов/приоритетов в доменные поля детерминирован и протестирован; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| CTX-003 | Реализовать SentryProvider | TODO | Не начато | Реализация: Интеграция через REST API. Stack traces, error frequency, affected users. Готово, если: Sentry ACL нормализует stack trace/error frequency/affected users в единый доменный формат, обработаны 404/429/5xx и pagination; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---
