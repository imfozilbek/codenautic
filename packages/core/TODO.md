# @codenautic/core — TODO

> Core: Domain + Application + Ports + Shared
>
> **Задач:** 407 | **Версий:** 75

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
- Покрываемые milestones: `M01`, `M02`, `M03`, `M04`, `M05`, `M11`, `M12`, `M15`, `M18`
- Порядок milestone-секций в этом файле повторяет порядок из roadmap

---

## Трассировка с PRODUCT.md

- Пакет: `core`
- Цель: задачи пакета напрямую собирают заявленные продуктовые возможности CodeNautic из `PRODUCT.md`.
- Ключевые capability направления:
- 20-stage review pipeline и SafeGuard-фильтры.
- Custom Rules и Continuous Learning в доменной модели.
- Conversation Agent и CCR Summary на уровне use cases.
- CodeCity, onboarding, causal/drift/predictive домены.
- KAG-домен: семантика, reasoning и knowledge-порты.

---

## Milestones

| Milestone | Файл |
|---|---|
| M00 — DDD Bootstrap (вне ROADMAP) | [todo/m00-ddd-bootstrap-core.md](todo/m00-ddd-bootstrap-core.md) |
| M01 — Core Foundation | [todo/m01-core-foundation.md](todo/m01-core-foundation.md) |
| M02 — Review Domain & Pipeline Architecture | [todo/m02-review-domain-pipeline-architecture.md](todo/m02-review-domain-pipeline-architecture.md) |
| M03 — 20-Stage Pipeline & SafeGuard | [todo/m03-20-stage-pipeline-safeguard.md](todo/m03-20-stage-pipeline-safeguard.md) |
| M04 — Business Domain | [todo/m04-business-domain.md](todo/m04-business-domain.md) |
| M05 — Seeds, Admin, Expert Panel | [todo/m05-seeds-admin-expert-panel.md](todo/m05-seeds-admin-expert-panel.md) |
| M11 — Agent Worker & Chat | [todo/m11-agent-worker-chat.md](todo/m11-agent-worker-chat.md) |
| M12 — AST, Scan, Onboarding | [todo/m12-ast-scan-onboarding.md](todo/m12-ast-scan-onboarding.md) |
| M15 — Advanced Core Features | [todo/m15-advanced-core-features.md](todo/m15-advanced-core-features.md) |
| M18 — KAG | [todo/m18-kag.md](todo/m18-kag.md) |

## Notes

- Детальные версии и задачи находятся в milestone-файлах в каталоге `todo/`.
- Этот индекс оставлен как входная точка для навигации по roadmap и планированию.
- `M00` — bootstrap-слой для запуска исполняемого DDD-контура; он не заменяет milestone из `ROADMAP.md`.
