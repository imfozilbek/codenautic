# @codenautic/runtime — TODO

> Runtime: API (NestJS) + Webhooks + Workers + Scheduler + MCP
>
> **Задач:** 283 | **Процессов:** 9

---

## Правила

1. **TDD** — тесты -> код -> рефакторинг
2. **Полная реализация** — без заглушек и срезания углов
3. **Нулевой мертвый код** — удаляй неиспользуемое
4. **JSDoc only** — только `/** */`
5. **Одна версия за раз** — заверши текущую до начала следующей
6. **Каждая задача** включает тесты, реализацию, экспорт из index.ts

---

## Соответствие ROADMAP.md

- Источник приоритезации: `ROADMAP.md` -> таблица milestones
- Покрываемые milestones: `M07`, `M08`, `M09`, `M10`, `M11`, `M12`, `M13`, `M14`, `M17`, `M18`
- Порядок milestone-секций в этом файле повторяет порядок из roadmap

---

## Трассировка с PRODUCT.md

- Пакет: `runtime`
- Цель: задачи пакета напрямую собирают заявленные продуктовые возможности CodeNautic из `PRODUCT.md`.
- Ключевые capability направления:
- API, Webhooks и worker-процессы review/scan/agent/notifications/analytics.
- Scheduler и MCP entrypoints для оркестрации процессов.
- E2E доставка AI-review результата обратно в PR/MR.
- Production-готовность: observability, security, deployment.
- KAG-процессы в review/chat/analytics runtime-потоках.

---

## Milestones

| Milestone | Файл |
|---|---|
| M00 — DDD Bootstrap (вне ROADMAP) | [todo/m00-ddd-bootstrap-runtime.md](todo/m00-ddd-bootstrap-runtime.md) |
| M07 — API Foundation | [todo/m07-api-foundation.md](todo/m07-api-foundation.md) |
| M08 — Webhooks & Review Worker E2E | [todo/m08-webhooks-review-worker-e2e.md](todo/m08-webhooks-review-worker-e2e.md) |
| M09 — Workers & Notifications | [todo/m09-workers-notifications.md](todo/m09-workers-notifications.md) |
| M10 — UI Foundation & Dashboard | [todo/m10-ui-foundation-dashboard.md](todo/m10-ui-foundation-dashboard.md) |
| M11 — Agent Worker & Chat | [todo/m11-agent-worker-chat.md](todo/m11-agent-worker-chat.md) |
| M12 — AST, Scan, Onboarding | [todo/m12-ast-scan-onboarding.md](todo/m12-ast-scan-onboarding.md) |
| M13 — CodeCity & Review UI | [todo/m13-codecity-review-ui.md](todo/m13-codecity-review-ui.md) |
| M14 — All Providers & Pages | [todo/m14-all-providers-pages.md](todo/m14-all-providers-pages.md) |
| M17 — Full UI + Production | [todo/m17-full-ui-production.md](todo/m17-full-ui-production.md) |
| M18 — KAG | [todo/m18-kag.md](todo/m18-kag.md) |

## Notes

- Детальные версии и задачи находятся в milestone-файлах в каталоге `todo/`.
- Этот индекс оставлен как входная точка для навигации по roadmap и планированию.
- `M00` — bootstrap-слой для запуска исполняемого DDD-контура; он не заменяет milestone из `ROADMAP.md`.
