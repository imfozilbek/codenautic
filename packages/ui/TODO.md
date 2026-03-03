# @codenautic/ui — TODO

> UI: единое web-приложение, вызывает `api` по HTTP

> **Задач:** 281 | **Версий:** 41 | **Выполнено:** 18

---

## Правила

1. **TDD First** — тесты -> код -> рефакторинг
2. **Полная реализация** — без заглушек и срезания углов
3. **Нулевой мертвый код** — удаляй неиспользуемое
4. **JSDoc only** — только `/** */`, без `//`
5. **A11y Built-in** — ARIA labels, keyboard navigation, focus management в каждом компоненте. WCAG AA. Не отдельная
   задача — встроено в acceptance criteria каждого UI-элемента
6. **Performance Built-in** — корректные размеры изображений (`width/height` + `loading="lazy"` + `decoding="async"`),
   dynamic imports для тяжёлых компонентов, proper cleanup в useEffect. Базовые практики, не отдельная версия

---

## Дополнительные UI-правила

1. **Brand Guidelines** — при планировании любой задачи читай `.skills/brand-guidelines/SKILL.md` (цвета, типографика,
   spacing, компоненты)
2. **frontend-design skill** — при создании UI компонентов и страниц используй skill `frontend-design` для генерации
   production-grade интерфейсов
3. **Consistency** — все компоненты следуют OKLch color palette, HeroUI v3 паттерну и Tailwind utility
   classes

---

## Migration Priority — HeroUI v3

- Принято решение о полной миграции UI-слоя на `HeroUI v3` (beta) c датой фиксации: `2026-03-03`.
- Все новые UI-задачи проектируются сразу под `HeroUI v3`.
- Упоминания `shadcn/ui`, `Radix`, `CVA` в старых задачах трактуются как legacy-формулировки и переписываются в рамках
  текущей миграции.
- Цель миграции: единый компонентный слой (`HeroUI v3`), единый theming, единая a11y-модель на базе React Aria.
- Legacy-контроль: в рамках migration-задач обязательно удалить/заменить `packages/ui/components.json` (shadcn schema),
  а также неиспользуемые зависимости legacy UI-слоя в `packages/ui/package.json`.
- UX-цель по темам: пользователь может менять тему интерфейса в стиле HeroUI (mode + presets + предпросмотр) без
  перезагрузки страницы.

---

## Политика зависимостей — Только OSS (No Paid)

- UI-слой использует **только** open-source зависимости, разрешающие коммерческое использование (например: MIT, Apache-2.0, BSD).
- Запрещено добавлять зависимости, где критичные функции закрыты paywall-ом (Pro/Enterprise/Commercial license).
- Если библиотека имеет dual-license или “free tier + paid extensions”, разрешено использовать только OSS-часть и только
  если это не блокирует реализацию задач из `packages/ui/TODO.md`.

Примеры запрещённых категорий (не исчерпывающе):

- Enterprise-таблицы/гриды с paywall: AG Grid Pro/Enterprise, MUI X Pro, KendoReact (commercial)
- Графы/лейауты с paywall: yFiles (commercial)
- Чарты с non-OSS лицензией: Highcharts (commercial)
- Платные расширения редакторов: TipTap Pro extensions (допускается только OSS-часть)

## Соответствие ROADMAP.md

- Источник приоритезации: `ROADMAP.md` -> таблица milestones
- Покрываемые milestones: `M10`, `M11`, `M12`, `M13`, `M14`, `M17`
- Порядок milestone-секций в этом файле повторяет порядок из roadmap

---

## Трассировка с PRODUCT.md

- Пакет: `ui`
- Цель: задачи пакета напрямую собирают заявленные продуктовые возможности CodeNautic из `PRODUCT.md`.
- Ключевые capability направления:
- Dashboard и операционные review-интерфейсы.
- Conversation/chat UI в контексте кода и CCR.
- Onboarding репозиториев и прогресс сканирования.
- CodeCity и графовые визуализации аналитики.
- Полное production-покрытие пользовательских страниц.

---

## Milestones

| Milestone                       | Файл                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------- |
| M10 — UI Foundation & Dashboard | [todo/m10-ui-foundation-dashboard.md](todo/m10-ui-foundation-dashboard.md)   |
| M11 — Conversation Chat UI      | [todo/m11-conversation-chat-ui.md](todo/m11-conversation-chat-ui.md)         |
| M12 — Repository Onboarding UI  | [todo/m12-repository-onboarding-ui.md](todo/m12-repository-onboarding-ui.md) |
| M13 — CodeCity & Review UI      | [todo/m13-codecity-review-ui.md](todo/m13-codecity-review-ui.md)             |
| M14 — All Providers & Pages     | [todo/m14-all-providers-pages.md](todo/m14-all-providers-pages.md)           |
| M17 — Full UI + Production      | [todo/m17-full-ui-production.md](todo/m17-full-ui-production.md)             |

## Notes

- Детальные версии и задачи находятся в milestone-файлах в каталоге `todo/`.
- Этот индекс оставлен как входная точка для навигации по roadmap и планированию.
