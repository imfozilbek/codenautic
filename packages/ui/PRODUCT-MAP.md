# CodeNautic UI — Product Map

> Что продукт даёт пользователю. Карта всех возможностей с привязкой к конкретным файлам.
>
> Все пути относительны от `packages/ui/src/`.

---

## 1. AI Code Review (ядро продукта)

Автоматический анализ Code Change Requests через 20-stage pipeline с SafeGuard фильтрацией AI-галлюцинаций.

### CCR Management — список всех ревью

> `pages/ccr-management.page.tsx:550` — `CcrManagementPage`

- Таблица CCR с колонками: ID, Title, Repository, Assignee, Comments, Updated, Status
- Поиск по title/id/repo/assignee
- Фильтры: status, team, repository
- Сохраняемые пресеты фильтров (localStorage) — save/load/update/delete
- Infinite scroll для подгрузки данных

| Компонент | Файл | Строка |
|---|---|---|
| ReviewsContent | `components/reviews/reviews-content.tsx` | 36 |
| ReviewsTable | `components/reviews/reviews-table.tsx` | 42 |
| ReviewsFilters | `components/reviews/reviews-filters.tsx` | — |
| ReviewStatusBadge | `components/reviews/review-status-badge.tsx` | 34 |

### CCR Review Detail — полный анализ одного CCR

> `pages/ccr-review-detail.page.tsx:94` — `CcrReviewDetailPage` (~1270 строк, самая тяжёлая страница)

Что видит пользователь:

- **Side-by-side diff** с подсветкой изменений, счётчиком added/removed строк
- **AI-комментарии** — вложенные треды с фидбеком (false_positive / duplicate / irrelevant)
- **SafeGuard pipeline trace** — 5 этапов фильтрации галлюцинаций: Deduplication → Hallucination → SeverityThreshold → PrioritySort → ImplementationCheck
- **Risk indicator** — уровень / score / причины
- **Chat с AI** прямо в контексте CCR (streaming token-by-token)
- **Impact analysis** на затронутые файлы
- **CodeCity treemap** для визуализации импакта
- **File neighborhood** — зависимости, последние изменения файла
- **Review history heatmap**
- **SSE stream viewer** для real-time данных

| Компонент | Файл | Строка |
|---|---|---|
| CodeDiffViewer | `components/reviews/code-diff-viewer.tsx` | 140 |
| ReviewCommentThread | `components/reviews/review-comment-thread.tsx` | 207 |
| ChatPanel | `components/chat/chat-panel.tsx` | 114 |
| ChatInput | `components/chat/chat-input.tsx` | 71 |
| ChatMessageBubble | `components/chat/chat-message-bubble.tsx` | 301 |
| ChatStreamingResponse | `components/chat/chat-streaming-response.tsx` | 30 |
| ChatThreadList | `components/chat/chat-thread-list.tsx` | 54 |
| ChatContextIndicator | `components/chat/chat-context-indicator.tsx` | — |
| CodeCityTreemap | `components/graphs/codecity-treemap.tsx` | 501 |
| ImpactAnalysisPanel | `components/graphs/impact-analysis-panel.tsx` | 117 |
| SseStreamViewer | `components/streaming/sse-stream-viewer.tsx` | 111 |

Вспомогательные файлы:
- `pages/ccr-review-detail/ccr-review-detail.types.ts` — типы для decisions, SafeGuard, feedback, risk, heatmaps
- `pages/ccr-review-detail/ccr-review-detail.constants.ts` — константы
- `pages/ccr-review-detail/ccr-review-detail.utils.ts` — утилиты
- `pages/ccr-data.ts` — mock данные CCR

---

## 2. Issues Tracking

> `pages/issues-tracking.page.tsx:249` — `IssuesTrackingPage`

Таблица обнаруженных проблем по всем репозиториям:

- Колонки: ID, Title, Repository, File Path, Severity, Status, Owner, Detected
- Severity уровни: critical / high / medium / low
- Status: open / in_progress / fixed / dismissed
- Inline-действия по каждой issue: acknowledge, snooze, fix, ignore
- Поиск по id/title/repo/file
- Фильтры: status, severity
- Infinite scroll

---

## 3. My Work — Triage Hub

> `pages/my-work.page.tsx:260` — `MyWorkPage`

Персональная очередь задач с SLA-приоритизацией:

- **5 категорий:** assigned_ccr, critical_issue, inbox_notification, pending_approval, stuck_job
- **SLA-статус:** healthy (зелёный) / warning (жёлтый) / breach (красный) — цветовая индикация borders
- **Escalation по ролям:** viewer → developer → lead → admin
- **Scope переключение:** мои / команды / репозитория (Alt+1/2/3)
- **Действия:** start work, mark done, escalate (role-gated), snooze, assign to me
- **Audit trail** — история изменений каждого элемента

---

## 4. Dashboard Mission Control

> `pages/dashboard-mission-control.page.tsx:204` — `DashboardMissionControlPage`

Центральный командный центр с полной картиной состояния проекта:

### Метрики и виджеты

| Виджет | Компонент | Строка | Что показывает |
|---|---|---|---|
| Hero Metric | `components/dashboard/dashboard-hero-metric.tsx` | 69 | SVG radial gauge (270°) — ключевой KPI с severity-coloring |
| KPI Cards | `components/dashboard/metric-card.tsx` | 69 | Open CCRs, reviewed, suggestions, active jobs — CountUp анимация, тренд |
| Metrics Grid | `components/dashboard/metrics-grid.tsx` | 32 | Staggered grid из MetricCards (1/2/4 колонки) |
| Flow Metrics | `components/dashboard/flow-metrics-widget.tsx` | 86 | Throughput/capacity — ComposedChart (line + area) |
| Team Activity | `components/dashboard/team-activity-widget.tsx` | 58 | CCRs merged per developer — BarChart |
| Token Usage | `components/dashboard/token-usage-dashboard-widget.tsx` | 57 | Donut (по моделям) + AreaChart (тренд стоимости) |
| Architecture Health | `components/dashboard/architecture-health-widget.tsx` | 25 | DDD compliance, layer violations — RadarChart |
| Status Distribution | `components/dashboard/status-distribution-chart.tsx` | 40 | Распределение статусов CCR — PieChart |
| Activity Timeline | `components/dashboard/activity-timeline.tsx` | 60 | Хронология событий (Today/Yesterday/...) |
| Activity Timeline Item | `components/dashboard/activity-timeline-item.tsx` | — | Элемент хронологии событий |
| Work Queue | `components/dashboard/dashboard-content.tsx` | 53 | Severity-aware карточки задач + timeline |
| Critical Signals | `components/dashboard/dashboard-critical-signals.tsx` | 55 | Ops degradation, data freshness, explainability |

### Управление

| Элемент | Компонент | Строка | Что делает |
|---|---|---|---|
| Scope Filters | `components/dashboard/dashboard-scope-filters.tsx` | 93 | Фильтры: org / repo / team / date range |
| Scope Filter Utils | `components/dashboard/scope-filter-utils.ts` | — | Утилиты фильтров scope |
| Date Range | `components/dashboard/dashboard-date-range-filter.tsx` | — | 24h / 7d / 30d / 90d |
| Dashboard Zones | `components/dashboard/dashboard-zone.tsx` | 48 | Collapse/expand секций (primary/secondary/tertiary) |
| Layout Presets | `components/dashboard/dashboard-layouts.ts` | — | Balanced / Focus / Operations |

Персонализация: layout preset, pinned shortcuts, сохранение в localStorage, share link.

Данные: `pages/dashboard-mock-data.ts`

---

## 5. CodeCity — 3D визуализация кодовой базы

> `pages/code-city-dashboard/code-city-dashboard.page.tsx:27` — `CodeCityDashboardPage`

Самая визуально-богатая часть продукта. 10 секций:

### Секции

| Секция | Файл | Что даёт пользователю |
|---|---|---|
| Tour | `pages/code-city-dashboard/sections/tour-section.tsx` | Guided walkthrough по визуализации |
| Controls | `pages/code-city-dashboard/sections/controls-section.tsx` | Выбор метрики / репозитория |
| Overview | `pages/code-city-dashboard/sections/overview-section.tsx` | Treemap overview |
| Visualization | `pages/code-city-dashboard/sections/visualization-section.tsx` | Основная 3D/2D визуализация |
| Refactoring | `pages/code-city-dashboard/sections/refactoring-section.tsx` | Refactoring planner |
| Prediction | `pages/code-city-dashboard/sections/prediction-section.tsx` | Предсказание рисков |
| Comparison | `pages/code-city-dashboard/sections/comparison-section.tsx` | Кросс-репозиторное сравнение |
| Gamification | `pages/code-city-dashboard/sections/gamification-section.tsx` | Sprint gamification |
| Ownership | `pages/code-city-dashboard/sections/ownership-section.tsx` | Knowledge/ownership maps |
| Analysis | `pages/code-city-dashboard/sections/analysis-section.tsx` | Root cause analysis |

### Визуализации

| Компонент | Файл | Строка | Тип |
|---|---|---|---|
| CodeCity3DScene | `components/graphs/codecity-3d-scene.tsx` | 329 | Three.js 3D город-метафора |
| CodeCityTreemap | `components/graphs/codecity-treemap.tsx` | 501 | 2D treemap альтернатива |

Утилиты treemap:
- `components/graphs/codecity-treemap.utils.ts` — утилиты treemap
- `components/graphs/codecity-treemap.constants.ts` — константы treemap
| 3D Scene Renderer | `components/graphs/codecity-3d/codecity-3d-scene-renderer.tsx` | — | Оптимизированный рендерер |
| 3D Scene Re-export | `components/graphs/codecity-3d-scene-renderer.tsx` | — | Barrel re-export из codecity-3d/ |
| 3D Layout Worker | `components/graphs/codecity-3d-layout.worker.ts` | — | Web Worker для layout |

Утилиты 3D:
- `components/graphs/codecity-3d/codecity-scene-constants.ts` — константы сцены
- `components/graphs/codecity-3d/codecity-scene-types.ts` — типы
- `components/graphs/codecity-3d/codecity-treemap-layout.ts` — алгоритм layout
- `components/graphs/codecity-3d/codecity-render-budget.ts` — бюджет рендеринга
- `components/graphs/codecity-3d/codecity-arc-builders.ts` — билдеры дуг
- `components/graphs/codecity-3d/codecity-visual-resolvers.ts` — визуальные резолверы
- `components/graphs/codecity-3d/codecity-3d-rendering.utils.ts` — утилиты рендеринга
- `components/graphs/codecity-3d/codecity-3d-rendering.constants.ts` — константы рендеринга

### Оверлеи (слои на визуализации)

| Оверлей | Файл | Что показывает |
|---|---|---|
| Ownership | `components/graphs/city-ownership-overlay.tsx` | Кто владеет каким кодом |
| Impact | `components/graphs/city-impact-overlay.tsx` | Зоны воздействия изменений |
| Prediction | `components/graphs/city-prediction-overlay.tsx` | Предсказанные проблемные зоны |
| Bus Factor | `components/graphs/city-bus-factor-overlay.tsx` | Риск bus factor |
| Refactoring | `components/graphs/city-refactoring-overlay.tsx` | Кандидаты на рефакторинг |
| Hot Areas | `components/graphs/hot-area-highlights.tsx` | Горячие точки кода |
| Causal Selector | `components/graphs/causal-overlay-selector.tsx` | Выбор causal analysis слоя |

### Prediction & Analysis

| Компонент | Файл | Строка | Что даёт |
|---|---|---|---|
| PredictionDashboard | `components/graphs/prediction-dashboard.tsx` | 103 | Обзор предсказаний |
| PredictionAccuracyWidget | `components/graphs/prediction-accuracy-widget.tsx` | — | Точность модели |
| PredictionExplainPanel | `components/graphs/prediction-explain-panel.tsx` | — | Объяснение факторов предсказания |
| PredictionComparisonView | `components/graphs/prediction-comparison-view.tsx` | — | Сравнение моделей |
| ChangeRiskGauge | `components/graphs/change-risk-gauge.tsx` | — | Визуальный gauge риска |
| TrendForecastChart | `components/graphs/trend-forecast-chart.tsx` | — | Прогноз тренда |
| TrendTimelineWidget | `components/graphs/trend-timeline-widget.tsx` | — | Timeline трендов |
| DistrictTrendIndicators | `components/graphs/district-trend-indicators.tsx` | — | Тренды по районам кода |

### Impact & Root Cause

| Компонент | Файл | Строка | Что даёт |
|---|---|---|---|
| ImpactAnalysisPanel | `components/graphs/impact-analysis-panel.tsx` | 117 | Детали impact analysis |
| ImpactGraphView | `components/graphs/impact-graph-view.tsx` | — | Граф распространения изменений |
| RootCauseChainViewer | `components/graphs/root-cause-chain-viewer.tsx` | 46 | Причинно-следственные цепочки |

### What-If & Simulation

| Компонент | Файл | Строка | Что даёт |
|---|---|---|---|
| WhatIfPanel | `components/graphs/what-if-panel.tsx` | 55 | «Что будет если...» сценарии |
| SimulationPanel | `components/graphs/simulation-panel.tsx` | 117 | Запуск и результаты симуляции |

### Refactoring

| Компонент | Файл | Строка | Что даёт |
|---|---|---|---|
| RefactoringDashboard | `components/graphs/refactoring-dashboard.tsx` | 99 | Кандидаты на рефакторинг |
| RefactoringTimeline | `components/graphs/refactoring-timeline.tsx` | — | История рефакторингов |
| RefactoringExportDialog | `components/graphs/refactoring-export-dialog.tsx` | — | Экспорт плана рефакторинга |

### Team & Knowledge

| Компонент | Файл | Строка | Что даёт |
|---|---|---|---|
| TeamLeaderboard | `components/graphs/team-leaderboard.tsx` | 99 | Лидерборд разработчиков |
| KnowledgeSiloPanel | `components/graphs/knowledge-silo-panel.tsx` | 61 | Обнаружение knowledge silos |
| KnowledgeMapExportWidget | `components/graphs/knowledge-map-export-widget.tsx` | — | Экспорт knowledge map |
| KnowledgeMapExport | `components/graphs/knowledge-map-export.ts` | — | Утилиты экспорта knowledge map |
| OwnershipTransitionWidget | `components/graphs/ownership-transition-widget.tsx` | — | Переходы ownership |
| BusFactorTrendChart | `components/graphs/bus-factor-trend-chart.tsx` | — | Тренд bus factor |

### Sprint & Gamification

| Компонент | Файл | Что даёт |
|---|---|---|
| SprintComparisonView | `components/graphs/sprint-comparison-view.tsx` | Сравнение спринтов |
| SprintSummaryCard | `components/graphs/sprint-summary-card.tsx` | Summary карточка спринта |
| AchievementsPanel | `components/graphs/achievements-panel.tsx` | Achievement badges |
| ROICalculatorWidget | `components/graphs/roi-calculator-widget.tsx` | Расчёт ROI |

### Tour & Onboarding

| Компонент | Файл | Строка | Что даёт |
|---|---|---|---|
| GuidedTourOverlay | `components/graphs/guided-tour-overlay.tsx` | 40 | Пошаговый тур |
| TourCustomizer | `components/graphs/tour-customizer.tsx` | — | Кастомизация тура |
| OnboardingProgressTracker | `components/graphs/onboarding-progress-tracker.tsx` | — | Прогресс онбординга |

### Health & Scatter

| Компонент | Файл | Что даёт |
|---|---|---|
| HealthTrendChart | `components/graphs/health-trend-chart.tsx` | Тренд health score (Recharts) |
| ChurnComplexityScatter | `components/graphs/churn-complexity-scatter.tsx` | Churn vs complexity scatter plot |

### Project Overview Panel

| Компонент | Файл | Что даёт |
|---|---|---|
| ProjectOverviewPanel | `components/graphs/project-overview-panel.tsx` | Обзор проекта |
| ExploreModesSidebar | `components/graphs/explore-mode-sidebar.tsx` | Sidebar для explore mode |
| AlertConfigDialog | `components/graphs/alert-config-dialog.tsx` | Настройка alert thresholds |

### Builders (CodeCity data builders)

- `pages/code-city-dashboard/builders/sprint-gamification-builders.ts`
- `pages/code-city-dashboard/builders/ownership-knowledge-builders.ts`
- `pages/code-city-dashboard/builders/impact-builders.ts`
- `pages/code-city-dashboard/builders/prediction-builders.ts`
- `pages/code-city-dashboard/builders/root-cause-builders.ts`
- `pages/code-city-dashboard/builders/explore-onboarding-builders.ts`

State и типы:
- `pages/code-city-dashboard/use-code-city-dashboard-state.ts`
- `pages/code-city-dashboard/code-city-dashboard-types.ts`
- `pages/code-city-dashboard/code-city-dashboard-utils.ts`
- `pages/code-city-dashboard/code-city-dashboard-mock-data.ts`

---

## 6. Графы зависимостей

| Граф | Файл | Строка | Что показывает |
|---|---|---|---|
| Package Dependencies | `components/graphs/package-dependency-graph.tsx` | 97 | Зависимости между пакетами |
| File Dependencies | `components/graphs/file-dependency-graph.tsx` | 245 | Зависимости между файлами |
| Function/Class Calls | `components/graphs/function-class-call-graph.tsx` | 241 | Граф вызовов функций/классов |
| Contributor Collaboration | `components/graphs/contributor-collaboration-graph.tsx` | 213 | Кто с кем работает |
| Graph Renderer | `components/graphs/xyflow-graph.tsx` | 252 | Базовый React Flow рендерер |
| Graph Renderer Core | `components/graphs/xyflow-graph-renderer.tsx` | — | Рендеринг с layout |
| Graph Layout | `components/graphs/xyflow-graph-layout.ts` | — | Алгоритмы layout |
| Graph Export | `components/graphs/graph-export.ts` | — | Экспорт графа |

Утилиты package dependency graph:
- `components/graphs/package-dependency-graph.constants.ts`
- `components/graphs/package-dependency-graph.utils.ts`

---

## 7. Repository Management

### Repositories List

> `pages/repositories-list.page.tsx:347` — `RepositoriesListPage`

- Таблица подключённых репозиториев: name, owner, branch, last scan, status, issue count
- Status: ready / scanning / error
- Summary карточки (ready/scanning/error counts)
- Поиск, фильтр по статусу, сортировка
- Retry scan для errored repos
- Inline scan error recovery (partial files, error messages)

### Repository Overview

> `pages/repository-overview/repository-overview.page.tsx:365` — `RepositoryOverviewPage`

- **Health score** с progress bar
- **Architecture summary** — DDD compliance, layer violations
- **Tech stack** items
- **Все 4 графа:** file dependency, function/class call, package dependency, CodeCity treemap
- **Metrics grid** — ключевые показатели
- **Rescan schedule** — frequency / weekday / hour / minute

Вспомогательные файлы:
- `pages/repository-overview/repository-overview-types.ts`
- `pages/repository-overview/repository-overview-utils.ts`
- `pages/repository-overview/repository-overview-mock-data.ts`

### Scan Progress

> `pages/scan-progress.page.tsx:350` — `ScanProgressPage`

- **Progress bar** (%)
- **5 фаз pipeline:** Queue → Clone → Analysis → Indexing → Report
- Состояние каждой фазы: completed / active / waiting
- **ETA** — estimated time
- **Stage logs** с timestamps
- **SSE EventSource** для real-time обновлений
- Действия: retry, cancel, open repository (когда done)

### Scan Error Recovery

> `pages/scan-error-recovery.page.tsx:14` — `ScanErrorRecoveryPage`

3-шаговый recovery flow после ошибок scan pipeline.

---

## 8. Отчёты

### Report Generator

> `pages/report-generator.page.tsx:56` — `ReportGeneratorPage`

- Тип отчёта: architecture / delivery / quality
- Формат: PDF / PNG / HTML
- Date range, секции (executive summary, architecture drift, delivery flow, risk hotspots)
- Preview payload, schedule

| Компонент | Файл | Строка |
|---|---|---|
| ReportTemplateEditor | `components/reports/report-template-editor.tsx` | 63 |
| ReportScheduleDialog | `components/reports/report-schedule-dialog.tsx` | 16 |

### Report List

> `pages/report-list.page.tsx:79` — `ReportListPage`

Фильтры (тип, date range), статус (completed/queued/failed), действия (open, regenerate, delete).

### Report Viewer

> `pages/report-viewer.page.tsx:89` — `ReportViewerPage`

- **LineChart** — тренд risk score / delivery velocity
- **BarChart** — распределение секций
- **AI Summary** — сгенерированный narrative

| Компонент | Файл | Строка |
|---|---|---|
| AiSummaryWidget | `components/reports/ai-summary-widget.tsx` | 23 |

---

## 9. Chat / AI Agent

Полноценный разговорный AI-агент в контексте каждого CCR:

| Компонент | Файл | Строка | Роль |
|---|---|---|---|
| ChatPanel | `components/chat/chat-panel.tsx` | 114 | Sliding aside панель |
| ChatInput | `components/chat/chat-input.tsx` | 71 | Ввод с file context, quick actions |
| ChatMessageBubble | `components/chat/chat-message-bubble.tsx` | 301 | Markdown rendering, code blocks, copy |
| ChatStreamingResponse | `components/chat/chat-streaming-response.tsx` | 30 | Token-by-token streaming |
| ChatThreadList | `components/chat/chat-thread-list.tsx` | 54 | Список тредов, filter, archive |
| ChatContextIndicator | `components/chat/chat-context-indicator.tsx` | — | Контекст (repo + CCR + files) |

Возможности:
- Контекстный — привязан к repo + CCR + файлам
- Streaming ответы token-by-token
- Markdown с code blocks (expand/collapse, copy)
- File path ссылки с номерами строк
- Thread management (create, archive, filter by repo/CCR)
- Quick actions
- Cancel streaming

---

## 10. Onboarding

### Onboarding Wizard

> `pages/onboarding-wizard/onboarding-wizard.page.tsx:24` — `OnboardingWizardPage`

4-шаговый wizard:

| Шаг | Файл |
|---|---|
| Provider Selection | `pages/onboarding-wizard/steps/provider-selection-step.tsx` |
| Repository Selection | `pages/onboarding-wizard/steps/repository-selection-step.tsx` |
| Scan Configuration | `pages/onboarding-wizard/steps/scan-configuration-step.tsx` |
| Bulk Scan Monitor | `pages/onboarding-wizard/steps/bulk-scan-jobs-monitor.tsx` |
| Steps Navigator | `pages/onboarding-wizard/steps/wizard-steps-navigator.tsx` |

Вспомогательные файлы:
- `pages/onboarding-wizard/onboarding-wizard-types.ts`
- `pages/onboarding-wizard/onboarding-wizard-schema.ts` — Zod validation
- `pages/onboarding-wizard/use-onboarding-wizard-state.ts` — state management
- `pages/onboarding-wizard/onboarding-templates.ts` — шаблоны конфигурации
- `pages/onboarding-wizard/bulk-repository-parser.ts` — парсер bulk repos

### Activation Checklist

> `components/onboarding/activation-checklist.tsx:150` — `ActivationChecklist`

8 шагов до first value:
1. Connect git provider
2. Connect LLM provider
3. Invite teammates
4. Configure SSO
5. Add repository
6. Run first scan
7. Set notifications
8. Baseline rules dry-run

Role-aware, прогресс %, persist в localStorage + API sync, dismissable.

---

## 11. Settings (21 страница)

### Settings Hub

> `pages/settings.page.tsx:24` — `SettingsPage`

Grid из карточек-навигации по всем настройкам.

### Code Review Configuration

> `pages/settings-code-review.page.tsx:92` — `SettingsCodeReviewPage`

| Компонент | Файл | Строка | Что настраивает |
|---|---|---|---|
| CodeReviewForm | `components/settings/code-review-form.tsx` | 34 | Cadence, severity, suggestions limit, drift signals |
| IgnorePatternEditor | `components/settings/ignore-pattern-editor.tsx` | — | Паттерны игнорирования файлов |
| RuleEditor | `components/settings/rule-editor.tsx` | 102 | Markdown правила с preview |
| RuleEditorMarkdownPreview | `components/settings/rule-editor-markdown-preview.tsx` | — | Markdown preview для правил |
| SuggestionLimitConfig | `components/settings/suggestion-limit-config.tsx` | — | Max suggestions per CCR |
| ReviewCadenceSelector | `components/settings/review-cadence-selector.tsx` | — | Manual / auto / autoPause |
| MCPToolList | `components/settings/mcp-tool-list.tsx` | — | MCP tools: ID, calls, errors, latency |
| PromptOverrideEditor | `components/settings/prompt-override-editor.tsx` | — | Override AI prompts |
| DryRunResultViewer | `components/settings/dry-run-result-viewer.tsx` | 33 | Тестовый прогон правил |
| CCRSummaryPreview | `components/settings/ccr-summary-preview.tsx` | — | Preview настроек CCR summary |
| ConfigurationEditor | `components/settings/configuration-editor.tsx` | 43 | YAML editor для codenautic-config |

### Git Providers

> `pages/settings-git-providers.page.tsx:73` — `SettingsGitProvidersPage`

GitHub / GitLab / Azure DevOps / Bitbucket — connect/disconnect, test connection.

| Компонент | Файл |
|---|---|
| GitProvidersList | `components/settings/git-providers-list.tsx` |
| GitProviderCard | `components/settings/git-provider-card.tsx` |
| TestConnectionButton | `components/settings/test-connection-button.tsx` |

### LLM Providers

> `pages/settings-llm-providers.page.tsx:213` — `SettingsLlmProvidersPage`

OpenAI / Anthropic / Google / Groq — provider, model, API key, endpoint, test.

| Компонент | Файл | Строка |
|---|---|---|
| LlmProviderForm | `components/settings/llm-provider-form.tsx` | 127 |

### BYOK (Bring Your Own Key)

> `pages/settings-byok.page.tsx:120` — `SettingsByokPage`

- Список ключей: provider, label, masked secret, active, rotation count
- Usage stats: requests, tokens
- Aggregate stats: total/active keys, total requests/tokens
- Действия: add, rotate, toggle, delete

### Token Usage Analytics

> `pages/settings-token-usage.page.tsx:341` — `SettingsTokenUsagePage`

- Табы: by-model / by-developer / by-ccr
- Date range filter, metrics grid
- DataFreshnessPanel, ExplainabilityPanel

### Integrations

> `pages/settings-integrations.page.tsx:168` — `SettingsIntegrationsPage`

Jira / Linear / Sentry / Slack — connect, sync toggle, context preview.

| Компонент | Файл |
|---|---|
| ContextSourceCard | `components/settings/context-source-card.tsx` |
| ContextPreview | `components/settings/context-preview.tsx` |
| SettingsFormSchemas | `components/settings/settings-form-schemas.ts` |

### Notifications

> `pages/settings-notifications.page.tsx:175` — `SettingsNotificationsPage`

Event types (review.completed, drift.alert, prediction.alert), channels (Slack/Discord/Teams/in-app).

### Webhooks

> `pages/settings-webhooks.page.tsx:206` — `SettingsWebhooksPage`

Outbound endpoints: URL, events, secret, delivery status (success/retrying/failed/disconnected).

### Team Management

> `pages/settings-team.page.tsx:376` — `SettingsTeamPage`

Teams с members (name, email, role), repository bindings, role-gated actions.

### Organization

> `pages/settings-organization.page.tsx:579` — `SettingsOrganizationPage`

Profile, members, roles, billing, domain settings.

### Billing

> `pages/settings-billing.page.tsx:152` — `SettingsBillingPage`

- Plans: starter / pro / enterprise
- Status: trial / active / past_due / canceled
- Premium entitlements: PR merge gate, cross-team policies, extended audit export
- Paywall banner, plan change history

### SSO

> `pages/settings-sso.page.tsx:76` — `SettingsSsoPage`

SAML (entity ID, SSO URL, X.509) + OIDC (issuer, client ID/secret), test connection.

### Rules Library

> `pages/settings-rules-library.page.tsx:116` — `SettingsRulesLibraryPage`

Prebuilt + custom rules: categories (architecture/performance/security/style), DSL expressions, test runner.

### Contract Validation

> `pages/settings-contract-validation/settings-contract-validation.page.tsx:21` — `SettingsContractValidationPage`

| Секция | Файл |
|---|---|
| Contract | `pages/settings-contract-validation/sections/contract-section.tsx` |
| Blueprint | `pages/settings-contract-validation/sections/blueprint-section.tsx` |
| Drift Violations | `pages/settings-contract-validation/sections/drift-violations-section.tsx` |
| Drift Trend | `pages/settings-contract-validation/sections/drift-trend-section.tsx` |
| Drift Alerts | `pages/settings-contract-validation/sections/drift-alerts-section.tsx` |
| Guardrails | `pages/settings-contract-validation/sections/guardrails-section.tsx` |

Вспомогательные файлы:
- `pages/settings-contract-validation/contract-validation-types.ts`
- `pages/settings-contract-validation/contract-validator.ts`
- `pages/settings-contract-validation/blueprint-parser.ts`
- `pages/settings-contract-validation/drift-analysis-utils.ts`
- `pages/settings-contract-validation/use-contract-validation-state.ts`
- `pages/settings-contract-validation/contract-validation-mock-data.ts`

### Privacy & Redaction

> `pages/settings-privacy-redaction.page.tsx:71` — `SettingsPrivacyRedactionPage`

Обнаружение PII/secrets (email, API key, token, secret) и автоматическая редакция.

### Provider Degradation Console

> `pages/settings-provider-degradation.page.tsx:49` — `SettingsProviderDegradationPage`

Мониторинг здоровья провайдеров: degradation level, affected features, ETA, queued actions.

### Adoption Analytics

> `pages/settings-adoption-analytics.page.tsx:139` — `SettingsAdoptionAnalyticsPage`

- Value realization KPIs: active users, median time to first value
- Adoption funnel (5 этапов): connect → add repo → first scan → first insights → first CCR reviewed
- Conversion + drop-off rates, workflow health per stage

### Concurrency

> `pages/settings-concurrency.page.tsx:123` — `SettingsConcurrencyPage`

Admin config с optimistic conflict resolution: severity threshold, ignore paths, approval toggle.

### Audit Logs

> `pages/settings-audit-logs.page.tsx:246` — `SettingsAuditLogsPage`

Аудит-трейл: actor, action type, timestamp, target, details. Фильтры + CSV export.

### Appearance

> `pages/settings-appearance.page.tsx:123` — `SettingsAppearancePage`

- Mode: light / dark / system
- Preset themes (quick + full list), random preset (Alt+R)
- Accent color picker + intensity slider
- Border radius sliders (global + form)
- Theme library CRUD: save, rename, duplicate, delete, export/import JSON
- Locale switcher с date/number format preview

Вспомогательные файлы:
- `pages/settings-appearance/appearance-settings.constants.ts`
- `pages/settings-appearance/appearance-settings.utils.ts`

### Jobs Center

> `pages/settings-jobs.page.tsx:305` — `SettingsJobsPage`

Background jobs: kind, status (queued/running/completed/failed/paused/stuck/canceled), schedules (hourly/weekly + timezone).

---

## 12. Layout & Navigation

| Компонент | Файл | Строка | Роль |
|---|---|---|---|
| DashboardLayout | `components/layout/dashboard-layout.tsx` | 64 | Root layout: sidebar + content |
| Sidebar | `components/layout/sidebar.tsx` | 31 | Collapsible навигация (240px / 48px) |
| SidebarNav | `components/layout/sidebar-nav.tsx` | — | Группы: Reviews, Operations, Analytics |
| SidebarActions | `components/layout/sidebar-actions.tsx` | — | Search, notifications, theme toggle |
| SidebarFooter | `components/layout/sidebar-footer.tsx` | — | Avatar, org switcher, quick links |
| ContentToolbar | `components/layout/content-toolbar.tsx` | — | Breadcrumbs, mobile menu, search, notifications |
| Header | `components/layout/header.tsx` | 81 | Legacy header (deprecated) |
| PageShell | `components/layout/page-shell.tsx` | 34 | Page wrapper: title, subtitle, actions |
| SettingsLayout | `components/layout/settings-layout.tsx` | 23 | 2-column settings layout |
| CommandPalette | `components/layout/command-palette.tsx` | 78 | Cmd+K глобальный поиск |
| MobileSidebar | `components/layout/mobile-sidebar.tsx` | — | Drawer для мобильной навигации |
| BrandMark | `components/layout/brand-mark.tsx` | — | Лого (compact / expanded) |
| UserMenu | `components/layout/user-menu.tsx` | — | Avatar dropdown |
| ThemeModeToggle | `components/layout/theme-mode-toggle.tsx` | — | Dark/System/Light toggle |
| ThemeToggle | `components/layout/theme-toggle.tsx` | — | Full theme switcher |
| NotificationAlerts | `components/layout/notification-alerts.tsx` | — | Animated alert stack |
| ShortcutsHelpModal | `components/layout/shortcuts-help-modal.tsx` | — | Modal всех шорткатов |
| SessionRecoveryModal | `components/layout/session-recovery-modal.tsx` | — | Re-auth при 401/419 |

Command Palette files:
- `components/layout/command-palette.constants.ts` — группы, ключи, storage keys
- `components/layout/command-palette.utils.ts` — fuzzy search, localStorage, item building

---

## 13. Infrastructure Components

| Компонент | Файл | Строка | Роль |
|---|---|---|---|
| SystemStateCard | `components/infrastructure/system-state-card.tsx` | 53 | Empty/error/loading/partial states |
| DataFreshnessPanel | `components/infrastructure/data-freshness-panel.tsx` | 129 | Freshness status + provenance drawer |
| ExplainabilityPanel | `components/infrastructure/explainability-panel.tsx` | 54 | Signal explainability + factors + export |

---

## 14. System Pages

| Страница | Файл | Строка | Роль |
|---|---|---|---|
| System Health | `pages/system-health.page.tsx` | 18 | Health check + feature flags |
| Help & Diagnostics | `pages/help-diagnostics.page.tsx` | 371 | Knowledge base + auto-diagnostics + support bundle |
| Session Recovery | `pages/session-recovery.page.tsx` | 14 | Re-auth flow |
| Scan Error Recovery | `pages/scan-error-recovery.page.tsx` | 14 | Scan failure recovery |

---

## 15. API Layer

### Endpoints

| Endpoint | Файл |
|---|---|
| Auth | `lib/api/endpoints/auth.endpoint.ts` |
| Code Review | `lib/api/endpoints/code-review.endpoint.ts` |
| CCR Summary | `lib/api/endpoints/ccr-summary.endpoint.ts` |
| CCR Workspace | `lib/api/endpoints/ccr-workspace.endpoint.ts` |
| Custom Rules | `lib/api/endpoints/custom-rules.endpoint.ts` |
| Dry Run | `lib/api/endpoints/dry-run.endpoint.ts` |
| External Context | `lib/api/endpoints/external-context.endpoint.ts` |
| Feature Flags | `lib/api/endpoints/feature-flags.endpoint.ts` |
| Git Providers | `lib/api/endpoints/git-providers.endpoint.ts` |
| Permissions | `lib/api/endpoints/permissions.endpoint.ts` |
| Repo Config | `lib/api/endpoints/repo-config.endpoint.ts` |
| System | `lib/api/endpoints/system.endpoint.ts` |

### Query Hooks

| Hook | Файл |
|---|---|
| useCodeReview | `lib/hooks/queries/use-code-review.ts` |
| useCcrSummary | `lib/hooks/queries/use-ccr-summary.ts` |
| useCcrWorkspace | `lib/hooks/queries/use-ccr-workspace.ts` |
| useDryRun | `lib/hooks/queries/use-dry-run.ts` |
| useExternalContext | `lib/hooks/queries/use-external-context.ts` |
| useFeatureFlagsQuery | `lib/hooks/queries/use-feature-flags-query.ts` |
| useGitProviders | `lib/hooks/queries/use-git-providers.ts` |
| usePermissionsQuery | `lib/hooks/queries/use-permissions-query.ts` |
| useReviewCadence | `lib/hooks/queries/use-review-cadence.ts` |
| useCustomRules | `lib/hooks/queries/use-custom-rules.ts` |
| useHealthQuery | `lib/hooks/queries/use-health-query.ts` |
| useRepoConfig | `lib/hooks/queries/use-repo-config.ts` |

### Custom Hooks

| Hook | Файл | Роль |
|---|---|---|
| useSSE | `lib/hooks/use-sse.ts` | SSE streaming + reconnection |
| usePolicyDrift | `lib/hooks/use-policy-drift.ts` | Policy drift detection |
| useOrganizationSwitcher | `lib/hooks/use-organization-switcher.ts` | Org switching |
| useProviderDegradation | `lib/hooks/use-provider-degradation.ts` | Provider health monitoring |
| useMultiTabSync | `lib/hooks/use-multi-tab-sync.ts` | Cross-tab synchronization |
| useDashboardShortcuts | `lib/hooks/use-dashboard-shortcuts.ts` | Keyboard shortcuts |
| useSessionRecovery | `lib/hooks/use-session-recovery.ts` | Session recovery logic |

### Infrastructure

| Модуль | Файл | Роль |
|---|---|---|
| HTTP Client | `lib/api/http-client.ts` | Base HTTP client |
| API Config | `lib/api/config.ts` | API configuration |
| API Types | `lib/api/types.ts` | Shared API types |
| Query Client | `lib/query/query-client.ts` | TanStack Query setup |
| Query Keys | `lib/query/query-keys.ts` | Query key factory |
| Analytics SDK | `lib/analytics/analytics-sdk.ts` | Event tracking |
| Analytics Types | `lib/analytics/analytics-types.ts` | Analytics type definitions |
| Analytics Context | `lib/analytics/analytics-context.tsx` | React context |
| Sentry | `lib/monitoring/sentry.ts` | Error monitoring |
| Web Vitals | `lib/monitoring/web-vitals.ts` | Performance metrics |
| Session Recovery | `lib/session/session-recovery.ts` | Session restore |
| Multi-tab Sync | `lib/sync/multi-tab-consistency.ts` | BroadcastChannel sync |
| Shortcut Registry | `lib/keyboard/shortcut-registry.ts` | Keyboard shortcuts |
| Schema Validation | `lib/validation/schema-validation.ts` | Zod validation |
| Toast | `lib/notifications/toast.ts` | Toast notifications |
| i18n | `lib/i18n/i18n.ts` | Internationalization |
| i18n Resources | `lib/i18n/i18n-resources.ts` | Translation resources |
| i18n Types | `lib/i18n/i18n-types.ts` | i18n type definitions |
| useLocale | `lib/i18n/use-locale.ts` | Locale hook |
| useDynamicTranslation | `lib/i18n/use-dynamic-translation.ts` | Dynamic translation hook |
| Security Headers | `lib/security/security-headers.ts` | CSP/security headers |

### Auth

| Модуль | Файл | Роль |
|---|---|---|
| AuthShell | `lib/auth/auth-shell.tsx` | Auth provider wrapper |
| AuthBoundary | `lib/auth/auth-boundary.tsx` | Route protection |
| AuthAccess | `lib/auth/auth-access.tsx` | Permission checks |
| AuthLoginPanel | `lib/auth/auth-login-panel.tsx` | Login UI |
| AuthSession | `lib/auth/auth-session.ts` | Session management |
| AuthHandlers | `lib/auth/auth-handlers.ts` | Auth event handlers |
| AuthRoleResolver | `lib/auth/auth-role-resolver.ts` | Role resolution |
| AuthStatus | `lib/auth/auth-status.ts` | Auth state |
| AuthUrl | `lib/auth/auth-url.ts` | Auth URL builder |
| AuthLabels | `lib/auth/auth-labels.ts` | Auth UI labels |
| AuthTypes | `lib/auth/types.ts` | Auth type definitions |
| useAuthBoundaryState | `lib/auth/use-auth-boundary-state.ts` | Auth boundary state hook |

### Utilities & Support Modules

| Модуль | Файл | Роль |
|---|---|---|
| cn() utility | `lib/utils.ts` | Утилита объединения CSS-классов (аналог clsx) |
| Generated Types | `lib/api/generated/index.ts` | OpenAPI-generated types (via `bun run codegen`) |

#### Access Control — `lib/access/`

| Файл | Роль |
|---|---|
| `lib/access/access-types.ts` | Типы ролей и permission guards |

#### Constants — `lib/constants/`

| Файл | Роль |
|---|---|
| `lib/constants/animation.ts` | Анимационные токены (duration, easing) |
| `lib/constants/chart-constants.ts` | Общие константы для графиков |
| `lib/constants/chart-recharts-defaults.ts` | Дефолтные настройки Recharts |
| `lib/constants/codecity-colors.ts` | Цветовая палитра CodeCity |
| `lib/constants/graph-colors.ts` | Цвета для dependency графов |
| `lib/constants/spacing.ts` | Spacing токены |
| `lib/constants/typography.ts` | Типографические токены |

#### Feature Flags — `lib/feature-flags/`

| Файл | Роль |
|---|---|
| `lib/feature-flags/feature-flags.ts` | Утилиты feature flags |

#### Navigation — `lib/navigation/`

| Файл | Роль |
|---|---|
| `lib/navigation/deep-link-guard.ts` | Валидация deep links |
| `lib/navigation/route-guard-map.ts` | Маппинг route → permission guards |
| `lib/navigation/settings-nav-items.tsx` | Построение навигации settings-страниц |

#### Permissions — `lib/permissions/`

| Файл | Роль |
|---|---|
| `lib/permissions/permissions.ts` | Permission checks |
| `lib/permissions/policy-drift.ts` | Обнаружение policy drift |
| `lib/permissions/ui-policy.ts` | UI policy enforcement |

#### Providers — `lib/providers/`

| Файл | Роль |
|---|---|
| `lib/providers/degradation-mode.ts` | State management деградации провайдеров |

#### Theme — `lib/theme/`

| Файл | Роль |
|---|---|
| `lib/theme/use-theme.ts` | Хук управления темой (mode, preset) |

#### Types — `lib/types/`

| Файл | Роль |
|---|---|
| `lib/types/ccr-types.ts` | Shared CCR type definitions |

#### Utils — `lib/utils/`

| Файл | Роль |
|---|---|
| `lib/utils/safe-json.ts` | Безопасный JSON.parse/stringify |
| `lib/utils/safe-storage.ts` | Безопасная работа с localStorage/sessionStorage |

---

## 16. Routing

> `routes/` — TanStack Router file-based routing

| Route | Файл |
|---|---|
| Root Layout | `routes/__root.tsx` |
| Dashboard (index) | `routes/index.tsx` |
| CodeCity | `routes/dashboard.code-city.tsx` |
| Reviews List | `routes/reviews.index.tsx` |
| Reviews Layout | `routes/reviews.tsx` |
| Review Detail | `routes/reviews.$reviewId.tsx` |
| Repositories | `routes/repositories.tsx` |
| Repository Detail | `routes/repositories.$repositoryId.tsx` |
| Issues | `routes/issues.tsx` |
| My Work | `routes/my-work.tsx` |
| Reports | `routes/reports.tsx` |
| Report Generator | `routes/reports.generate.tsx` |
| Report Viewer | `routes/reports.viewer.tsx` |
| Onboarding | `routes/onboarding.tsx` |
| Settings Hub | `routes/settings.tsx` |
| Login | `routes/login.tsx` |
| System Health | `routes/system-health.tsx` |
| Help & Diagnostics | `routes/help-diagnostics.tsx` |
| Scan Progress | `routes/scan-progress.tsx` |
| Scan Error Recovery | `routes/scan-error-recovery.tsx` |
| Session Recovery | `routes/session-recovery.tsx` |
| 21 settings routes | `routes/settings-*.tsx` |

Route tree generated: `routeTree.gen.ts`

---

## 17. App Shell & Entry Point

Точка входа приложения, глобальные providers, error boundary, suspense.

| Файл | Роль |
|---|---|
| `main.tsx` | Entry point: Sentry init, i18n init, Web Vitals, ReactDOM.createRoot |
| `vite-env.d.ts` | Vite type declarations (import.meta.env) |
| `app/globals.css` | Глобальные CSS стили (Tailwind directives) |
| `app/app.tsx` | Root компонент: QueryClientProvider + ThemeProvider + RouterProvider + AnalyticsProvider + Toast |
| `app/router.ts` | TanStack Router instance (createRouter с routeTree) |
| `app/error-fallback.tsx` | Error boundary fallback (status code + retry) |
| `app/route-suspense-fallback.tsx` | Suspense fallback для lazy-загрузки route-экранов |

---

## 18. Иконки

> `components/icons/app-icons.ts` — централизованный реестр Lucide-иконок

Единый файл с именованными ре-экспортами из `lucide-react`. Все компоненты импортируют иконки через этот реестр.

---

## 19. Общие типы форм

> `components/forms/index.ts` — `IFormSelectOption`

Shared-интерфейс для select-полей (value, label, description, isDisabled). Используется в settings-формах.

---

## 20. Dev Mocks (MSW)

Mock Service Worker для dev-режима — перехватывает HTTP-запросы к API.

| Файл | Роль |
|---|---|
| `mocks/handlers.ts` | MSW request handlers (auth, endpoints) |
| `mocks/browser.ts` | MSW browser worker (setupWorker) |

---

## Сводка: что продукт даёт пользователю

| Возможность | Количество | Ключевые страницы |
|---|---|---|
| AI Code Review | 20-stage pipeline + SafeGuard | CCR Management, CCR Detail |
| Визуализация кода | 3D CodeCity + 4 типа графов + 6 оверлеев | CodeCity Dashboard, Repository Overview |
| Предсказание проблем | Prediction + What-If + Simulation | CodeCity (prediction section) |
| Командная аналитика | Leaderboard + Bus Factor + Knowledge Silos + Ownership | CodeCity (ownership/gamification sections) |
| Triage Hub | SLA-aware с escalation | My Work |
| Отчёты | Generate + Schedule + AI Summary + Export | Reports (3 страницы) |
| AI Agent | Contextual chat + streaming | Chat (в CCR Detail) |
| Multi-provider | 4 Git + 5 LLM + 4 Context + 5 Notification | Settings (4 страницы) |
| Enterprise Controls | SSO + RBAC + Audit + BYOK + Privacy + Billing | Settings (6 страниц) |
| Onboarding | Wizard + Activation Checklist | Onboarding, Dashboard |
| Infrastructure | Health + Diagnostics + Session Recovery + Jobs | System (4 страницы) |

**Итого: ~200 компонентов, 39 страниц (18 основных + 21 settings), 12 API endpoints, 12 query hooks, 7 custom hooks, 14 utility modules, ~412 файлов (.ts/.tsx).**