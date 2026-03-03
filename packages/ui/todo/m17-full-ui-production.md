# M17 — Full UI + Production

> Источник: `packages/ui/TODO.md`

> **Задач:** ~119 | **Проверка:** Все UI страницы, CodeCity 3D, reports

> **Результат milestone:** Готов полный production UI слой с advanced analytics/visualization страницами.

## v0.13.0 — Advanced Панель управления Widgets

> Team activity, flow metrics, token usage, architecture. ~80K tokens.

> **Результат версии:** Завершена версия «v0.13.0 — Advanced Dashboard Widgets» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-DASH-003 | Реализовать team Activity widget | TODO | Не начато | Реализация: CCRs merged by developer. Activity chart (Recharts). Готово, если: для WEB-DASH-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-DASH-004 | Реализовать flow Metrics widget | TODO | Не начато | Реализация: Flow efficiency, delivery capacity. Trend indicators. Готово, если: для WEB-DASH-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-DASH-005 | Реализовать token usage dashboard | TODO | Не начато | Реализация: Usage by model. Cost breakdown. Trend chart. Готово, если: token usage dashboard показывает консистентные агрегаты по моделям и стоимости, фильтры периода/проекта обновляют графики без рассинхронизации данных; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-DASH-006 | Реализовать architecture dashboard widgets | TODO | Не начато | Реализация: Health score. Layer violations. DDD compliance. Готово, если: для WEB-DASH-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.14.0 — Advanced Graph Features

> Node details, impact paths, export, cross-repo. ~70K tokens.

> **Результат версии:** Завершена версия «v0.14.0 — Advanced Graph Features» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-GRAPH-006 | Реализовать node details panel | TODO | Не начато | Реализация: Show node information. Готово, если: для WEB-GRAPH-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-GRAPH-007 | Реализовать highlight impact paths | TODO | Не начато | Реализация: Highlight affected paths. Готово, если: для WEB-GRAPH-007 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-GRAPH-008 | Реализовать export graph (SVG/PNG) | TODO | Не начато | Реализация: Export visualizations. Готово, если: для WEB-GRAPH-008 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-GRAPH-009 | Реализовать cross-repo visualization | TODO | Не начато | Реализация: Multi-repo graph. Готово, если: для WEB-GRAPH-009 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.14.1 — Graph Scale Policy (Enterprise)

> Progressive rendering, clustering/LOD, safe fallbacks for huge graphs. ~60K tokens.

> **Результат версии:** Завершена версия «v0.14.1 — Graph Scale Policy (Enterprise)» в рамках M17; инкремент делает Graph Explorer предсказуемым на крупных репозиториях.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-GRAPH-010 | Реализовать graph scale budget + progressive render | TODO | Не начато | Реализация: Политика scale budget: пороги nodes/edges, ограничение depth, progressive render (сначала “skeleton graph”, затем догрузка), cancel/abort при превышении budget, индикатор “rendering/too large” и UX подсказки. Готово, если: графы на больших репозиториях не приводят к фризам main thread, пользователь явно понимает ограничения/порог, и может продолжить работу через альтернативный путь (filters/depth/clusters) без “white screen”; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-GRAPH-011 | Реализовать clustering + LOD interactions | TODO | Не начато | Реализация: Кластеризация (по пакету/модулю/папке) + LOD: свернутые кластеры, “expand cluster”, “focus path”, lazy-load деталей при зуме, сохранение состояния раскладки. Готово, если: пользователь может исследовать большие графы через уровни детализации без потери контекста, операции expand/focus работают детерминированно, а поведение совместимо с keyboard navigation и reduced motion; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-GRAPH-012 | Реализовать huge-graph fallback views + exports | TODO | Не начато | Реализация: Fallback-виды для огромных графов: табличный список зависимостей/путей (paths), “top hubs” summary, экспорт (SVG/PNG/JSON) из агрегированного представления, и предупреждение о неполноте данных. Готово, если: даже при невозможности отрисовать full graph пользователь получает полезный результат (summary/paths/export) и может продолжить анализ/поделиться артефактом без performance regressions; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.15.0 — External Context UI

> External context config, sources, preview. ~80K tokens.

> **Результат версии:** Завершена версия «v0.15.0 — External Context UI» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-PAGE-016 | Реализовать external Context Конфигурация | TODO | Не начато | Реализация: Configure Jira, Linear, Sentry integrations. Готово, если: для WEB-PAGE-016 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PAGE-017 | Реализовать context Sources | TODO | Не начато | Реализация: Manage external context sources. Готово, если: для WEB-PAGE-017 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-COMP-009 | Реализовать contextSourceCard | TODO | Не начато | Реализация: External context source card. Готово, если: для WEB-COMP-009 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-COMP-010 | Реализовать contextPreview | TODO | Не начато | Реализация: Preview loaded context. Готово, если: для WEB-COMP-010 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-HOOK-008 | Реализовать useExternalContext() | TODO | Не начато | Реализация: React Query hook. Fetch/manage context. Готово, если: для WEB-HOOK-008 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.16.0 — Репозиторий Конфигурация UI

> Repository config, ignore patterns. ~80K tokens.

> **Результат версии:** Завершена версия «v0.16.0 — Repository Config UI» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-PAGE-018 | Реализовать репозиторий Конфигурация | TODO | Не начато | Реализация: Edit codenautic-config.yml visually. Готово, если: для WEB-PAGE-018 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PAGE-019 | Реализовать ignore Patterns | TODO | Не начато | Реализация: Configure file ignore patterns. Готово, если: для WEB-PAGE-019 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-COMP-011 | Реализовать конфигурацияEditor | TODO | Не начато | Реализация: YAML config visual editor. Готово, если: для WEB-COMP-011 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-COMP-012 | Реализовать ignorePatternEditor | TODO | Не начато | Реализация: File pattern editor. Готово, если: для WEB-COMP-012 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-HOOK-009 | Реализовать useRepoConfig() | TODO | Не начато | Реализация: React Query hook. Load/save config. Готово, если: для WEB-HOOK-009 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.17.0 — Review Modes UI

> Dry-run, review cadence settings. ~80K tokens.

> **Результат версии:** Завершена версия «v0.17.0 — Review Modes UI» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-PAGE-020 | Реализовать dry-Run Results | TODO | Не начато | Реализация: View dry-run review results. Готово, если: для WEB-PAGE-020 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PAGE-021 | Реализовать review Cadence Settings | TODO | Не начато | Реализация: Auto/manual/auto-pause modes. Готово, если: для WEB-PAGE-021 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-COMP-013 | Реализовать dryRunResultViewer | TODO | Не начато | Реализация: Display dry-run results. Готово, если: для WEB-COMP-013 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-COMP-014 | Реализовать reviewCadenceSelector | TODO | Не начато | Реализация: Cadence mode selector. Готово, если: для WEB-COMP-014 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-HOOK-010 | Реализовать useDryRun() | TODO | Не начато | Реализация: React Query hook. Trigger dry-run. Готово, если: для WEB-HOOK-010 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-HOOK-011 | Реализовать useReviewCadence() | TODO | Не начато | Реализация: React Query hook. Manage cadence. Готово, если: для WEB-HOOK-011 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.18.0 — CCR Summary & Advanced UI

> CCR summary, IDE sync, MCP dashboard. ~100K tokens.

> **Результат версии:** Завершена версия «v0.18.0 — CCR Summary & Advanced UI» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-PAGE-022 | Реализовать CCR Summary Settings | TODO | Не начато | Реализация: Configure CCR summary generation. Готово, если: для WEB-PAGE-022 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PAGE-023 | Реализовать iDE Sync Settings | TODO | Не начато | Реализация: Configure IDE plugin sync. Готово, если: для WEB-PAGE-023 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PAGE-024 | Реализовать MCP Server Панель управления | TODO | Не начато | Реализация: View MCP tool usage/stats. Готово, если: для WEB-PAGE-024 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-COMP-015 | Реализовать CCRSummaryPreview | TODO | Не начато | Реализация: CCR summary preview card. Готово, если: для WEB-COMP-015 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-COMP-016 | Реализовать suggestionLimitConfig | TODO | Не начато | Реализация: Configure suggestion limits. Готово, если: для WEB-COMP-016 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-COMP-017 | Реализовать promptOverrideEditor | TODO | Не начато | Реализация: Custom prompt editor. Dynamic import. Готово, если: для WEB-COMP-017 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-COMP-018 | Реализовать MCPToolList | TODO | Не начато | Реализация: List available MCP tools. Готово, если: для WEB-COMP-018 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-HOOK-012 | Реализовать useCCRSummary() | TODO | Не начато | Реализация: React Query hook. Generate/view CCR summaries. Готово, если: для WEB-HOOK-012 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.19.0 — Search & Filters

> Debounced search, filter persistence, URL sync, global search. ~60K tokens.

> **Результат версии:** Завершена версия «v0.19.0 — Search & Filters» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-SRCH-001 | Реализовать filterPersistence | TODO | Не начато | Реализация: LocalStorage filter persistence. Готово, если: для WEB-SRCH-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-SRCH-002 | Реализовать uRLFilterSync | TODO | Не начато | Реализация: Sync filters with URL (TanStack Router search params). Shareable filter URLs. Готово, если: для WEB-SRCH-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-HOOK-013 | Реализовать useFilterPersistence() | TODO | Не начато | Реализация: Persist filters to localStorage. Готово, если: для WEB-HOOK-013 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-SRCH-003 | Реализовать filterPresets | TODO | Не начато | Реализация: Saved filter presets. CRUD. Готово, если: для WEB-SRCH-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-SRCH-004 | Реализовать globalSearch (Cmd+K command palette) | TODO | Не начато | Реализация: Глобальный поиск + command palette: hotkey `Cmd+K`/`Ctrl+K`, overlay с input, fuzzy search, группировка результатов (CCRs/Issues/Repos/Settings/Actions), “recent” и “pinned actions”, permission-aware фильтрация и tenant-safe контекст, возможность запускать действия (create repo scan, open diagnostics, switch org) без ухода на отдельные страницы. Готово, если: палитра открывается и управляется полностью клавиатурой (стрелки/enter/esc), корректно озвучивается screen reader (роль диалога/списка/результата), не показывает объекты вне текущего tenant/прав, работает быстро на 10k+ сущностей (debounce + memoized index, без фризов), и поддерживает deep-links в 1 шаг; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-KBD-001 | Реализовать keyboard shortcuts registry + global handlers | TODO | Не начато | Реализация: Единая система шорткатов (registry + hook): глобальные команды (Cmd+K, /, g d и т.д.), page-scope команды, конфликт-детектор, и защита от перехвата ввода в текстовых полях. Добавить i18n-friendly labels и route-aware enable/disable. Готово, если: шорткаты работают консистентно на всех ключевых страницах, не ломают ввод/IME, корректно управляют фокусом, и покрыты тестами на базовые комбинации; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-KBD-002 | Реализовать shortcuts overlay / cheatsheet (HeroUI-like) | TODO | Не начато | Реализация: Overlay/Modal со списком доступных шорткатов (категории: Navigation, Triage, Graph, Editor), поиск по шорткатам, и подсказки “Press ? for help”. Интеграция с registry из `WEB-KBD-001`. Готово, если: пользователь может открыть справку без мыши (например `Shift+?`), overlay доступен screen reader, и список шорткатов всегда соответствует реально включенным комбинациям на странице; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.20.0 — Virtualized Views

> Specific virtualized tables/lists for existing pages. ~60K tokens.

> **Результат версии:** Завершена версия «v0.20.0 — Virtualized Views» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-VIRT-002 | Реализовать virtualizedIssuesTable | TODO | Не начато | Реализация: Virtual scrolling for Issues list. Готово, если: для WEB-VIRT-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-VIRT-003 | Реализовать virtualizedCCRList | TODO | Не начато | Реализация: Virtual scrolling for CCR list. Готово, если: для WEB-VIRT-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-VIRT-004 | Реализовать stickyTableHeaders | TODO | Не начато | Реализация: Sticky headers for virtual tables. Готово, если: для WEB-VIRT-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-VIRT-005 | Реализовать rowHeightEstimator | TODO | Не начато | Реализация: Dynamic row height estimation. Готово, если: для WEB-VIRT-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-INF-003 | Реализовать CCRInfiniteList | TODO | Не начато | Реализация: CCR list with infinite scroll. Готово, если: для WEB-INF-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-INF-004 | Реализовать issuesInfiniteList | TODO | Не начато | Реализация: Issues list with infinite scroll. Готово, если: для WEB-INF-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.22.0 — CodeCity 3D — Premium Visualization

> 3D-город кодовой базы (Three.js/WebGL). Premium feature. ~150K tokens.

> **Результат версии:** Завершена версия «v0.22.0 — CodeCity 3D — Premium Visualization» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-CITY3-001 | Реализовать three.js scene setup | TODO | Не начато | Реализация: WebGL renderer. Camera controls (orbit, pan, zoom). Responsive canvas. Dynamic import. Готово, если: для WEB-CITY3-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CITY3-002 | Реализовать building generation | TODO | Не начато | Реализация: Buildings = files. Height = LOC. Width = complexity. Color = coverage. Готово, если: для WEB-CITY3-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CITY3-003 | Реализовать district layout | TODO | Не начато | Реализация: Districts = packages. Squarified treemap layout. Labels on ground plane. Готово, если: для WEB-CITY3-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CITY3-004 | Реализовать camera presets | TODO | Не начато | Реализация: Bird's eye, street level, focus-on-building. Smooth transitions. Готово, если: для WEB-CITY3-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CITY3-005 | Реализовать CCR impact highlighting | TODO | Не начато | Реализация: Glow/pulse effect on affected buildings. Ripple effect for impacted neighbors. Готово, если: для WEB-CITY3-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CITY3-006 | Реализовать building interaction | TODO | Не начато | Реализация: Click building → side panel with file details. Hover → tooltip. Готово, если: для WEB-CITY3-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CITY3-007 | Реализовать time-lapse animation | TODO | Не начато | Реализация: Animate city growth over commits. Play/pause/scrub timeline. Pre-computed snapshots. Готово, если: для WEB-CITY3-007 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CITY3-008 | Реализовать performance optimization | TODO | Не начато | Реализация: LOD (level of detail). Instanced rendering. Frustum culling. 60fps target. **P0.**. Готово, если: 3D рендер удерживает целевой fps на контрольном наборе сцен и включает деградацию качества без фризов при превышении GPU/CPU budget; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CITY3-009 | Реализовать Web Worker layout compute | TODO | Не начато | Реализация: Treemap layout computation в Web Worker. Не блокирует main thread. Готово, если: для WEB-CITY3-009 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CITY3-010 | Реализовать gPU budget + 2D fallback | TODO | Не начато | Реализация: GPU memory budget. Auto-detect weak devices. Fallback to 2D treemap при WebGL issues. Готово, если: для WEB-CITY3-010 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.24.0 — Causal Overlays 2D

> 2D CodeCity overlays для причинно-следственных данных. ~60K tokens.

> **Результат версии:** Завершена версия «v0.24.0 — Causal Overlays 2D» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-CAUSAL-001 | Реализовать temporalCouplingOverlay | TODO | Не начато | Реализация: Lines connecting temporally coupled files on treemap. Thickness = coupling strength. Toggle on/off. Готово, если: для WEB-CAUSAL-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CAUSAL-002 | Реализовать bugHeatOverlay | TODO | Не начато | Реализация: Red-yellow gradient overlay on files by bug introduction frequency. Color legend. Date range filter. Готово, если: для WEB-CAUSAL-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CAUSAL-003 | Реализовать churnComplexityScatter | TODO | Не начато | Реализация: Side panel: scatter plot churn vs complexity. Click point → highlight file on city. Quadrant labels. Готово, если: для WEB-CAUSAL-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CAUSAL-004 | Реализовать healthTrendChart | TODO | Не начато | Реализация: Line chart: health score over time. Annotations for significant events. Period selector. Готово, если: для WEB-CAUSAL-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CAUSAL-005 | Реализовать rootCauseChainViewer | TODO | Не начато | Реализация: Click issue → expand causal chain. Tree/DAG visualization. Each node clickable. Готово, если: для WEB-CAUSAL-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CAUSAL-006 | Реализовать causalOverlaySelector | TODO | Не начато | Реализация: Dropdown/toolbar to switch between causal overlays. Active overlay indicator. Готово, если: для WEB-CAUSAL-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.25.0 — Causal Overlays 3D

> 3D CodeCity causal overlays. ~40K tokens.

> **Результат версии:** Завершена версия «v0.25.0 — Causal Overlays 3D» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-CAUS3D-001 | Реализовать 3DCausalArcs | TODO | Не начато | Реализация: Animated arcs in 3D space connecting coupled files. Color by coupling type. Particle flow. Готово, если: для WEB-CAUS3D-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CAUS3D-002 | Реализовать 3DBugEmission | TODO | Не начато | Реализация: Buildings emit particles (red) proportional to bug frequency. Pulse effect on recent bugs. Готово, если: для WEB-CAUS3D-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CAUS3D-003 | Реализовать 3DHealthAura | TODO | Не начато | Реализация: Ambient glow around districts: green (healthy) → red (degrading). Changes over time. Готово, если: для WEB-CAUS3D-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CAUS3D-004 | Реализовать 3DChainNavigation | TODO | Не начато | Реализация: Click issue in 3D → camera flies along root cause chain. Breadcrumb trail in 3D space. Готово, если: для WEB-CAUS3D-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-CAUS3D-005 | Реализовать 3DCausalTimeline | TODO | Не начато | Реализация: Time slider replays causal events on 3D city. Play/pause. Speed control. Готово, если: для WEB-CAUS3D-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.26.0 — Onboarding Tour Overlay

> Guided tour overlay на CodeCity для онбординга разработчиков. ~50K tokens.

> **Результат версии:** Завершена версия «v0.26.0 — Onboarding Tour Overlay» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-TOUR-001 | Реализовать guidedTourOverlay | TODO | Не начато | Реализация: Step-by-step tour on CodeCity. Spotlight on current area. Next/prev/skip. Tooltip with description. Готово, если: для WEB-TOUR-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-TOUR-002 | Реализовать projectOverviewPanel | TODO | Не начато | Реализация: Side panel: project architecture summary, tech stack, entry points. Generated from scan data. Готово, если: для WEB-TOUR-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-TOUR-003 | Реализовать exploreModeSidebar | TODO | Не начато | Реализация: Sidebar with recommended exploration paths. Click path → camera navigates. Filter by role. Готово, если: для WEB-TOUR-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-TOUR-004 | Реализовать hotAreaHighlights | TODO | Не начато | Реализация: Highlight critical/important areas on city. Pulsing effect. Labels with short description. Готово, если: для WEB-TOUR-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-TOUR-005 | Реализовать onboardingProgressTracker | TODO | Не начато | Реализация: Track which areas developer explored. Progress bar. Completion badge per module. Готово, если: для WEB-TOUR-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-TOUR-006 | Реализовать tourCustomizer | TODO | Не начато | Реализация: Admin can create custom tours. Drag-and-drop step ordering. Custom descriptions per stop. Готово, если: для WEB-TOUR-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.27.0 — Refactoring Planner

> UI для планирования рефакторинга с ROI. ~50K tokens.

> **Результат версии:** Завершена версия «v0.27.0 — Refactoring Planner» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-REFAC-001 | Реализовать refactoringDashboard | TODO | Не начато | Реализация: Панель управления: prioritized refactoring targets. Sortable by ROI, risk, effort. Filter by module. Готово, если: для WEB-REFAC-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-REFAC-002 | Реализовать rOICalculatorWidget | TODO | Не начато | Реализация: Interactive ROI calculator. Select files → see estimated ROI. Sliders for effort/risk weights. Готово, если: для WEB-REFAC-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-REFAC-003 | Реализовать cityRefactoringOverlay | TODO | Не начато | Реализация: Overlay on CodeCity: buildings colored by refactoring priority. Click → refactoring details. Готово, если: для WEB-REFAC-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-REFAC-004 | Реализовать simulationPanel | TODO | Не начато | Реализация: Before/after simulation: toggle to see predicted city after refactoring. Metrics comparison. Готово, если: для WEB-REFAC-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-REFAC-005 | Реализовать refactoringTimeline | TODO | Не начато | Реализация: Gantt-like timeline for planned refactorings. Dependencies between refactoring tasks. Готово, если: для WEB-REFAC-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-REFAC-006 | Реализовать refactoringExportDialog | TODO | Не начато | Реализация: Export refactoring plan as Jira tickets / GitHub issues. Template customization. Готово, если: для WEB-REFAC-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.28.0 — Impact Planning Visualization

> UI для визуализации blast radius и impact analysis. ~40K tokens.

> **Результат версии:** Завершена версия «v0.28.0 — Impact Planning Visualization» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-IMPACT-001 | Реализовать impactAnalysisPanel | TODO | Не начато | Реализация: Select files → see blast radius. Affected files, tests, consumers listed. Risk score. Готово, если: для WEB-IMPACT-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-IMPACT-002 | Реализовать cityImpactOverlay | TODO | Не начато | Реализация: CodeCity overlay: ripple effect from selected files. Color intensity = impact degree. Готово, если: для WEB-IMPACT-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-IMPACT-003 | Реализовать changeRiskGauge | TODO | Не начато | Реализация: Risk gauge widget for proposed changes. Green/yellow/red zones. Historical comparison. Готово, если: для WEB-IMPACT-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-IMPACT-004 | Реализовать impactGraphView | TODO | Не начато | Реализация: Dependency graph showing impact propagation. Animated edges. Collapsible nodes. Готово, если: для WEB-IMPACT-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-IMPACT-005 | Реализовать whatIfPanel | TODO | Не начато | Реализация: "What if I change X?" panel. Multi-file selection. Aggregated impact analysis. Готово, если: для WEB-IMPACT-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.29.0 — Knowledge Map & Bus Factor Overlay

> UI для карты знаний и bus factor на CodeCity. ~60K tokens.

> **Результат версии:** Завершена версия «v0.29.0 — Knowledge Map & Bus Factor Overlay» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-KNOW-001 | Реализовать ownershipOverlay | TODO | Не начато | Реализация: CodeCity overlay: buildings colored by primary owner. Legend with contributor names/avatars. Готово, если: для WEB-KNOW-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-KNOW-002 | Реализовать busFactorOverlay | TODO | Не начато | Реализация: CodeCity overlay: districts colored by bus factor risk. Red = 1 contributor, green = well-spread. Готово, если: для WEB-KNOW-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-KNOW-003 | Реализовать knowledgeSiloPanel | TODO | Не начато | Реализация: Panel listing knowledge silos. Click silo → highlight on city. Risk score per silo. Готово, если: для WEB-KNOW-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-KNOW-004 | Реализовать contributorGraphPage | TODO | Не начато | Реализация: Force-directed graph of contributor collaboration. Node size = commits. Edge = co-authoring. Готово, если: для WEB-KNOW-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-KNOW-005 | Реализовать ownershipTransitionWidget | TODO | Не начато | Реализация: Timeline showing ownership changes for a file/module. Handoff indicators. Готово, если: для WEB-KNOW-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-KNOW-006 | Реализовать busFactorTrendChart | TODO | Не начато | Реализация: Line chart: bus factor trend over time per module. Annotations for team changes. Готово, если: для WEB-KNOW-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-KNOW-007 | Реализовать knowledgeMapExport | TODO | Не начато | Реализация: Export knowledge map as PNG/SVG for documentation. Include legend and metadata. Готово, если: для WEB-KNOW-007 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.30.0 — Predictive Analytics Overlay

> UI для AI-предсказаний на CodeCity. ~60K tokens.

> **Результат версии:** Завершена версия «v0.30.0 — Predictive Analytics Overlay» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-PRED-001 | Реализовать predictionOverlay | TODO | Не начато | Реализация: CodeCity overlay: buildings outlined by predicted risk. Dashed border = high risk forecast. Готово, если: для WEB-PRED-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PRED-002 | Реализовать predictionDashboard | TODO | Не начато | Реализация: Панель управления: predicted hotspots, quality trends, bug-prone files. Confidence scores. Готово, если: для WEB-PRED-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PRED-003 | Реализовать predictionExplainPanel | TODO | Не начато | Реализация: Click prediction → LLM explanation panel. "Why this file is predicted to become a hotspot.". Готово, если: для WEB-PRED-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PRED-004 | Реализовать trendForecastChart | TODO | Не начато | Реализация: Line chart with historical data + forecast zone (shaded). Confidence interval bands. Готово, если: для WEB-PRED-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PRED-005 | Реализовать predictionAccuracyWidget | TODO | Не начато | Реализация: Track prediction accuracy over time. Confusion matrix light. "We predicted X, Y actually happened.". Готово, если: для WEB-PRED-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PRED-006 | Реализовать alertConfigDialog | TODO | Не начато | Реализация: Configure prediction alerts: thresholds, channels, frequency. Per-module granularity. Готово, если: для WEB-PRED-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-PRED-007 | Реализовать predictionComparisonView | TODO | Не начато | Реализация: Compare predictions across time: "3 months ago we predicted X, what happened?". Готово, если: для WEB-PRED-007 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.31.0 — Sprint Gamification UI

> Спринтовая геймификация для CodeCity. ~50K tokens.

> **Результат версии:** Завершена версия «v0.31.0 — Sprint Gamification UI» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-GAME-001 | Реализовать sprintComparisonView | TODO | Не начато | Реализация: Side-by-side CodeCity: before sprint vs after sprint. Animated transition. Metrics delta. Готово, если: для WEB-GAME-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-GAME-002 | Реализовать districtTrendIndicators | TODO | Не начато | Реализация: Arrows/icons on CodeCity districts showing improvement/degradation. Green up / red down. Готово, если: для WEB-GAME-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-GAME-003 | Реализовать achievementsPanel | TODO | Не начато | Реализация: Panel showing sprint achievements: "Reduced complexity in module X by 20%". Badge icons. Готово, если: для WEB-GAME-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-GAME-004 | Реализовать teamLeaderboard | TODO | Не начато | Реализация: Leaderboard widget: team quality rankings. Sortable by metric. Sprint/month/quarter toggle. Готово, если: для WEB-GAME-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-GAME-005 | Реализовать sprintSummaryCard | TODO | Не начато | Реализация: Summary card: key sprint metrics, achievements count, overall improvement score. Готово, если: для WEB-GAME-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-GAME-006 | Реализовать trendTimelineWidget | TODO | Не начато | Реализация: Timeline: sprint-over-sprint trends. Sparklines per metric. Click sprint → detailed comparison. Готово, если: для WEB-GAME-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.32.0 — Architecture Drift UI

> UI для отслеживания архитектурного дрифта. ~60K tokens.

> **Результат версии:** Завершена версия «v0.32.0 — Architecture Drift UI» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-DRIFT-001 | Реализовать blueprintEditorPage | TODO | Не начато | Реализация: Upload/edit architecture blueprint. YAML editor with syntax highlighting. Visual preview. Готово, если: для WEB-DRIFT-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-DRIFT-002 | Реализовать driftReportPage | TODO | Не начато | Реализация: Drift analysis results: violations list, severity, affected files. Filter, sort, export. Готово, если: для WEB-DRIFT-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-DRIFT-003 | Реализовать driftOverlayCodeCity | TODO | Не начато | Реализация: CodeCity overlay: red highlights on files/modules violating blueprint. Click → violation details. Готово, если: для WEB-DRIFT-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-DRIFT-004 | Реализовать blueprintVsRealityView | TODO | Не начато | Реализация: Side-by-side: intended architecture vs actual structure. Color-coded differences. Готово, если: для WEB-DRIFT-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-DRIFT-005 | Реализовать driftTrendChart | TODO | Не начато | Реализация: Line chart: drift score over time. Annotations for architecture changes. Готово, если: для WEB-DRIFT-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-DRIFT-006 | Реализовать driftAlertConfig | TODO | Не начато | Реализация: Configure drift alerts: threshold for violation count/severity. Notification channels. Готово, если: для WEB-DRIFT-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-DRIFT-007 | Реализовать architectureGuardrails | TODO | Не начато | Реализация: Configure guardrails: allowed/forbidden imports, layer rules. YAML + visual editor. Готово, если: для WEB-DRIFT-007 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.33.0 — Executive Reports UI

> UI для генерации и просмотра отчётов. ~50K tokens.

> **Результат версии:** Завершена версия «v0.33.0 — Executive Reports UI» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-REPORT-001 | Реализовать reportGeneratorPage | TODO | Не начато | Реализация: Report configuration: type, sections, date range, format. Preview before generation. Готово, если: для WEB-REPORT-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-REPORT-002 | Реализовать reportViewerPage | TODO | Не начато | Реализация: View generated report in-browser. Interactive charts. Download PDF/PNG. Share link. Готово, если: для WEB-REPORT-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-REPORT-003 | Реализовать reportListPage | TODO | Не начато | Реализация: List all generated reports. Filter by type, date. Status badges. Delete/regenerate actions. Готово, если: для WEB-REPORT-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-REPORT-004 | Реализовать aISummaryWidget | TODO | Не начато | Реализация: AI-generated narrative summary widget. Regenerate button. Copy to clipboard. Готово, если: для WEB-REPORT-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-REPORT-005 | Реализовать reportScheduleDialog | TODO | Не начато | Реализация: Configure scheduled report delivery. Recipients, cron, format. Preview schedule. Готово, если: для WEB-REPORT-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-REPORT-006 | Реализовать reportTemplateEditor | TODO | Не начато | Реализация: Edit report templates: drag-and-drop sections, custom branding, section configuration. Готово, если: для WEB-REPORT-006 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## v0.34.0 — Review Context UI

> UI для CodeCity как контекста при code review. ~40K tokens.

> **Результат версии:** Завершена версия «v0.34.0 — Review Context UI» в рамках M17; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| WEB-RVCTX-001 | Реализовать reviewContextSidebar | TODO | Не начато | Реализация: Sidebar in review page: CodeCity mini-map showing CCR context. Click to expand. Готово, если: для WEB-RVCTX-001 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-RVCTX-002 | Реализовать CCRImpactCityView | TODO | Не начато | Реализация: Full CodeCity view with CCR files highlighted. Blast radius visualization. Neighborhood context. Готово, если: для WEB-RVCTX-002 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-RVCTX-003 | Реализовать reviewHistoryHeatmap | TODO | Не начато | Реализация: Heatmap overlay on CodeCity: past review activity on CCR files. High activity = hot. Готово, если: для WEB-RVCTX-003 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-RVCTX-004 | Реализовать fileNeighborhoodPanel | TODO | Не начато | Реализация: Panel showing "neighborhood" of changed files: related files, dependencies, recent changes. Готово, если: для WEB-RVCTX-004 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |
| WEB-RVCTX-005 | Реализовать reviewRiskIndicator | TODO | Не начато | Реализация: Risk indicator badge on review page. Powered by impact analysis + historical data. Готово, если: для WEB-RVCTX-005 ключевой пользовательский флоу проходит end-to-end в UI без ошибок, есть component + integration покрытие, проверены a11y (keyboard/focus/aria/contrast) и responsive для mobile/tablet/desktop; DoD: `cd packages/ui && bun run lint && bun run typecheck && bun run test`. |

---

## Version Summary

| Version | Group | Tasks |
|---------|-------|-------|
| v0.0.0 | Package Foundation | 1 |
| v0.1.0 | Foundation | 12 |
| v0.2.0 | Auth & Monitoring | 5 |
| v0.3.0 | Design System | 4 |
| v0.4.0 | Layout | 5 |
| v0.5.0 | Forms & List Infrastructure | 9 |
| v0.6.0 | Core Pages | 5 |
| v0.6.1 | UI Stack Migration: Setup & Infrastructure | 8 |
| v0.6.2 | UI Stack Migration: Components | 8 |
| v0.6.3 | UI Stack Migration: Tests & Verification | 6 |
| v0.7.0 | Dashboard Widgets | 6 |
| v0.35.0 | Conversation Chat UI | 8 |
| v0.23.0 | Repository Onboarding UI | 7 |
| v0.8.0 | Review UI | 4 |
| v0.9.0 | Real-time & Data Hooks | 5 |
| v0.10.0 | Graph Visualization Part 1 | 5 |
| v0.21.0 | Treemap Visualization | 8 |
| v0.11.0 | Additional Pages Part 1 | 5 |
| v0.12.0 | Additional Pages Part 2 | 6 |
| v0.13.0 | Advanced Dashboard Widgets | 4 |
| v0.14.0 | Advanced Graph Features | 4 |
| v0.15.0 | External Context UI | 5 |
| v0.16.0 | Repository Config UI | 5 |
| v0.17.0 | Review Modes UI | 6 |
| v0.18.0 | CCR Summary & Advanced UI | 8 |
| v0.19.0 | Search & Filters | 5 |
| v0.20.0 | Virtualized Views | 6 |
| v0.22.0 | Premium Visualization | 10 |
| v0.24.0 | Causal Overlays 2D | 6 |
| v0.25.0 | Causal Overlays 3D | 5 |
| v0.26.0 | Onboarding Tour Overlay | 6 |
| v0.27.0 | Refactoring Planner | 6 |
| v0.28.0 | Impact Planning Visualization | 5 |
| v0.29.0 | Knowledge Map & Bus Factor Overlay | 7 |
| v0.30.0 | Predictive Analytics Overlay | 7 |
| v0.31.0 | Sprint Gamification UI | 6 |
| v0.32.0 | Architecture Drift UI | 7 |
| v0.33.0 | Executive Reports UI | 6 |
| v0.34.0 | Review Context UI | 5 |
| **Итого** | **39 версий** | **236** |
