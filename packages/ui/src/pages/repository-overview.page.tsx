import {
    type ChangeEvent,
    type ReactElement,
    useEffect,
    useState,
} from "react"

import { Link } from "@tanstack/react-router"

import {
    FileDependencyGraph,
    type IFileDependencyNode,
    type IFileDependencyRelation,
} from "@/components/graphs/file-dependency-graph"
import {
    FunctionClassCallGraph,
    type IFunctionCallNode,
    type IFunctionCallRelation,
} from "@/components/graphs/function-class-call-graph"
import {
    PackageDependencyGraph,
    type IPackageDependencyNode,
    type IPackageDependencyRelation,
} from "@/components/graphs/package-dependency-graph"
import { Alert, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { type IMetricGridMetric, MetricsGrid } from "@/components/dashboard/metrics-grid"

type TRepositoryRisk = "critical" | "high" | "low"
type THighlight = "danger" | "warning" | "success"
type TRescanScheduleMode = "manual" | "hourly" | "daily" | "weekly" | "custom"

interface IArchitectureSummary {
    /** Компонент архитектуры. */
    readonly area: string
    /** Оценка риска (low/high/critical). */
    readonly risk: TRepositoryRisk
    /** Короткое описание текущего состояния. */
    readonly summary: string
}

interface ITechStackItem {
    /** Название технологии. */
    readonly name: string
    /** Версия (если указана). */
    readonly version: string
    /** Описание применённости. */
    readonly note: string
}

interface IRepositoryOverviewProfile {
    /** Уникальный идентификатор (`owner/repo`). */
    readonly id: string
    /** Владелец репозитория. */
    readonly owner: string
    /** Имя репозитория. */
    readonly name: string
    /** Основная ветка. */
    readonly branch: string
    /** Время последнего скана. */
    readonly lastScanAt: string
    /** Количество проанализированных файлов. */
    readonly filesScanned: number
    /** Количество найденных инцидентов по качеству. */
    readonly totalFindings: number
    /** Уровень health score по последнему скану. */
    readonly healthScore: number
    /** Архитектурное резюме по слоям. */
    readonly architectureSummary: ReadonlyArray<IArchitectureSummary>
    /** Ключевые KPI. */
    readonly keyMetrics: ReadonlyArray<IMetricGridMetric>
    /** Используемый стек. */
    readonly techStack: ReadonlyArray<ITechStackItem>
    /** Значение расписания скана по умолчанию (cron). */
    readonly defaultRescanCron: string
}

interface IRepositoryFileDependencyProfile {
    /** Список файлов репозитория для отображения в графе зависимостей. */
    readonly files: ReadonlyArray<IFileDependencyNode>
    /** Список зависимостей между файлами в репозитории. */
    readonly dependencies: ReadonlyArray<IFileDependencyRelation>
}

interface IRepositoryFunctionCallProfile {
    /** Сущности (функции и классы) для отображения в call-graph. */
    readonly nodes: ReadonlyArray<IFunctionCallNode>
    /** Связи вызовов между сущностями. */
    readonly callRelations: ReadonlyArray<IFunctionCallRelation>
}

interface IRepositoryPackageDependencyProfile {
    /** Список пакетов в виде зависимых модулей. */
    readonly nodes: ReadonlyArray<IPackageDependencyNode>
    /** Связи между модулями/пакетами. */
    readonly packageRelations: ReadonlyArray<IPackageDependencyRelation>
}

interface IRescanScheduleValues {
    /** Режим расписания. */
    readonly mode: TRescanScheduleMode
    /** Минута запуска (0-59). */
    readonly minute: number
    /** Час запуска (0-23). */
    readonly hour: number
    /** День недели (0-6, 0 — Sunday). */
    readonly weekday: number
    /** Кастомное cron-выражение для режима `custom`. */
    readonly customCron: string
}

interface IRescanScheduleChangePayload {
    /** Идентификатор репозитория. */
    readonly repositoryId: string
    /** Итоговое cron-выражение после сохранения. */
    readonly cronExpression: string
    /** Режим расписания после сохранения. */
    readonly mode: TRescanScheduleMode
}

interface IRescanScheduleOption {
    /** Значение режима. */
    readonly value: TRescanScheduleMode
    /** Человекочитаемая метка. */
    readonly label: string
}

interface IRescanWeekdayOption {
    /** Число дня недели для cron (0–6). */
    readonly value: number
    /** Название дня. */
    readonly label: string
}

interface IRepositoryOverviewProps {
    /** ID репозитория (`owner/repo`). */
    readonly repositoryId: string
    /** Колбек после сохранения расписания рескана. */
    readonly onRescanScheduleChange?: (payload: IRescanScheduleChangePayload) => void
}

const RESCAN_HOUR_OPTIONS: ReadonlyArray<number> = createRangeValues(24)
const RESCAN_MINUTE_OPTIONS: ReadonlyArray<number> = createRangeValues(60)
const RESCAN_FREQUENCY_OPTIONS: ReadonlyArray<IRescanScheduleOption> = [
    {
        label: "По требованию",
        value: "manual",
    },
    {
        label: "Каждый час",
        value: "hourly",
    },
    {
        label: "Ежедневно",
        value: "daily",
    },
    {
        label: "Еженедельно",
        value: "weekly",
    },
    {
        label: "Кастомный cron",
        value: "custom",
    },
]

const RESCAN_WEEKDAY_OPTIONS: ReadonlyArray<IRescanWeekdayOption> = [
    { label: "Воскресенье", value: 0 },
    { label: "Понедельник", value: 1 },
    { label: "Вторник", value: 2 },
    { label: "Среда", value: 3 },
    { label: "Четверг", value: 4 },
    { label: "Пятница", value: 5 },
    { label: "Суббота", value: 6 },
]

const DEFAULT_RESCAN_VALUES: IRescanScheduleValues = {
    customCron: "",
    hour: 8,
    minute: 0,
    mode: "manual",
    weekday: 1,
} as const

const WEEKDAYS_TO_LABELS: Readonly<Record<number, string>> = {
    0: "Воскресенье",
    1: "Понедельник",
    2: "Вторник",
    3: "Среда",
    4: "Четверг",
    5: "Пятница",
    6: "Суббота",
}

const REPOSITORY_OVERVIEWS: ReadonlyArray<IRepositoryOverviewProfile> = [
    {
        architectureSummary: [
            {
                area: "API gateway",
                risk: "low",
                summary:
                    "Входящий слой разделяет traffic и выполняет базовую auth-схему " +
                    "через OIDC без регрессионных точек.",
            },
            {
                area: "Workers",
                risk: "high",
                summary:
                    "Найдены циклические зависимости между job-координатором и queue adapter; " +
                    "требует выделить контракт.",
            },
            {
                area: "Data layer",
                risk: "low",
                summary: "Слой хранения стабилен, покрытие миграций выше 80%.",
            },
        ],
        branch: "main",
        filesScanned: 1240,
        healthScore: 72,
        id: "platform-team/api-gateway",
        keyMetrics: [
            {
                caption: "Последняя проверка показала 3 critical item",
                id: "critical-issues",
                label: "Critical issues",
                trendDirection: "up",
                trendLabel: "-1",
                value: "3",
            },
            {
                caption: "Изменения в architecture debt",
                id: "architecture-debt",
                label: "Architecture debt score",
                trendDirection: "up",
                trendLabel: "+6%",
                value: "18",
            },
            {
                caption: "Риск-файлов по линтингу и тайпингу",
                id: "typed-files",
                label: "Type-covered files",
                trendDirection: "neutral",
                trendLabel: "Stable",
                value: "1120",
            },
            {
                caption: "Текущий уровень уведомлений",
                id: "notification-latency",
                label: "Median latency",
                trendDirection: "down",
                trendLabel: "-12%",
                value: "0.9s",
            },
        ],
        lastScanAt: "2026-01-01T10:40:00Z",
        name: "api-gateway",
        owner: "platform-team",
        techStack: [
            {
                name: "Node.js",
                note: "Runtime: сервисная обвязка API",
                version: "20.11",
            },
            {
                name: "Express",
                note: "HTTP API и middleware",
                version: "4.19",
            },
            {
                name: "PostgreSQL",
                note: "Persistent storage",
                version: "16",
            },
        ],
        totalFindings: 3,
        defaultRescanCron: "10 3 * * *",
    },
    {
        architectureSummary: [
            {
                area: "Frontend shell",
                risk: "low",
                summary:
                    "Модульный подход сохранен, критические цепочки " +
                    "в UI не перегружены.",
            },
            {
                area: "State",
                risk: "high",
                summary:
                    "Обнаружен общий глобальный state store, возможен shared mutation баг " +
                    "при параллельных сканах.",
            },
            {
                area: "Build",
                risk: "low",
                summary:
                    "CI pipeline детерминированен, flaky tests отсутствуют " +
                    "в последних 7 днях.",
            },
        ],
        branch: "main",
        filesScanned: 640,
        healthScore: 88,
        id: "frontend-team/ui-dashboard",
        keyMetrics: [
            {
                caption: "Новые предупреждения после обновления ui",
                id: "quality",
                label: "Quality warnings",
                trendDirection: "down",
                trendLabel: "-4%",
                value: "5",
            },
            {
                caption: "Сигналы по accessibility",
                id: "a11y",
                label: "A11Y checks",
                trendDirection: "neutral",
                trendLabel: "Stable",
                value: "14",
            },
            {
                caption: "Показатель тестового покрытия",
                id: "coverage",
                label: "Test coverage",
                trendDirection: "up",
                trendLabel: "+3%",
                value: "73%",
            },
            {
                caption: "Последний scan window",
                id: "scan-window",
                label: "Scan window",
                trendDirection: "neutral",
                trendLabel: "1m 43s",
                value: "103s",
            },
        ],
        lastScanAt: "2026-01-01T09:10:00Z",
        name: "ui-dashboard",
        owner: "frontend-team",
        techStack: [
            {
                name: "React",
                note: "Framework + stateful modules",
                version: "18.3",
            },
            {
                name: "TypeScript",
                note: "Строгая типизация хуков",
                version: "5.4",
            },
            {
                name: "HeroUI",
                note: "Сетка, карточки, таблицы и chips",
                version: "3.x",
            },
        ],
        totalFindings: 5,
        defaultRescanCron: "0 5 * * *",
    },
    {
        architectureSummary: [
            {
                area: "Worker runner",
                risk: "critical",
                summary:
                    "Обнаружены гонки данных между job queue и retry manager; требуется " +
                    "отдельный lock mechanism.",
            },
            {
                area: "Persistence",
                risk: "high",
                summary:
                    "Точки записи в Redis не идемпотентны; " +
                    "возможны дублирующиеся задачи.",
            },
            {
                area: "Monitoring",
                risk: "low",
                summary: "Метрики в хорошем состоянии, alert policy покрывает " +
                    "SLO на 95p latency.",
            },
        ],
        branch: "release",
        filesScanned: 910,
        healthScore: 61,
        id: "backend-core/payment-worker",
        keyMetrics: [
            {
                caption: "Кол-во фоновый задач, упавших в очередь",
                id: "failed-jobs",
                label: "Failed jobs",
                trendDirection: "up",
                trendLabel: "+12%",
                value: "9",
            },
            {
                caption: "Средняя задержка worker response",
                id: "worker-latency",
                label: "Worker latency",
                trendDirection: "down",
                trendLabel: "-8%",
                value: "1.8s",
            },
            {
                caption: "Параллельные воркеры",
                id: "active-workers",
                label: "Active workers",
                trendDirection: "neutral",
                trendLabel: "8",
                value: "8",
            },
            {
                caption: "Нагрузочный стресс при ночных пайплайнах",
                id: "stress-events",
                label: "Stress events",
                trendDirection: "up",
                trendLabel: "+2",
                value: "7",
            },
        ],
        lastScanAt: "2026-01-01T07:50:00Z",
        name: "payment-worker",
        owner: "backend-core",
        techStack: [
            {
                name: "NestJS",
                note: "Worker handlers и lifecycle hooks",
                version: "10.0",
            },
            {
                name: "Redis",
                note: "Кэш и distributed locks",
                version: "7.2",
            },
            {
                name: "Docker",
                note: "Deployment и local environment",
                version: "24.0",
            },
        ],
        totalFindings: 11,
        defaultRescanCron: "0 2 * * 1",
    },
]

const FALLBACK_ARCHITECTURE_SUMMARY: ReadonlyArray<IArchitectureSummary> = [
    {
        area: "Repository overview",
        risk: "critical",
        summary:
            "Информация по репозиторию отсутствует, требуется " +
            "повторно запустить скан.",
    },
]

const FILE_DEPENDENCY_VIEWS: Readonly<Record<string, IRepositoryFileDependencyProfile>> = {
    "platform-team/api-gateway": {
        dependencies: [
            {
                relationType: "import",
                source: "src/index.ts",
                target: "src/api/server.ts",
            },
            {
                relationType: "import",
                source: "src/index.ts",
                target: "src/lib/config.ts",
            },
            {
                relationType: "import",
                source: "src/api/server.ts",
                target: "src/api/auth.ts",
            },
            {
                relationType: "import",
                source: "src/api/server.ts",
                target: "src/api/repository.ts",
            },
            {
                relationType: "import",
                source: "src/api/auth.ts",
                target: "src/lib/config.ts",
            },
            {
                relationType: "import",
                source: "src/api/repository.ts",
                target: "src/lib/logger.ts",
            },
            {
                relationType: "import",
                source: "src/api/auth.ts",
                target: "src/api/notifications.ts",
            },
        ],
        files: [
            {
                complexity: 12,
                id: "src/api/auth.ts",
                path: "src/api/auth.ts",
            },
            {
                complexity: 10,
                id: "src/api/repository.ts",
                path: "src/api/repository.ts",
            },
            {
                complexity: 14,
                id: "src/api/server.ts",
                path: "src/api/server.ts",
            },
            {
                complexity: 8,
                id: "src/index.ts",
                path: "src/index.ts",
            },
            {
                complexity: 6,
                id: "src/lib/config.ts",
                path: "src/lib/config.ts",
            },
            {
                complexity: 4,
                id: "src/lib/logger.ts",
                path: "src/lib/logger.ts",
            },
            {
                complexity: 5,
                id: "src/api/notifications.ts",
                path: "src/api/notifications.ts",
            },
        ],
    },
    "frontend-team/ui-dashboard": {
        dependencies: [
            {
                relationType: "import",
                source: "src/app.tsx",
                target: "src/main.tsx",
            },
            {
                relationType: "import",
                source: "src/app.tsx",
                target: "src/app/router.tsx",
            },
            {
                relationType: "import",
                source: "src/app/router.tsx",
                target: "src/pages/dashboard.tsx",
            },
            {
                relationType: "import",
                source: "src/app/router.tsx",
                target: "src/pages/settings.tsx",
            },
            {
                relationType: "import",
                source: "src/components/app-shell.tsx",
                target: "src/hooks/use-auth.ts",
            },
            {
                relationType: "import",
                source: "src/components/app-shell.tsx",
                target: "src/components/theme-switch.tsx",
            },
        ],
        files: [
            {
                complexity: 10,
                id: "src/app.tsx",
                path: "src/app.tsx",
            },
            {
                complexity: 16,
                id: "src/app/router.tsx",
                path: "src/app/router.tsx",
            },
            {
                complexity: 9,
                id: "src/components/app-shell.tsx",
                path: "src/components/app-shell.tsx",
            },
            {
                complexity: 7,
                id: "src/hooks/use-auth.ts",
                path: "src/hooks/use-auth.ts",
            },
            {
                complexity: 12,
                id: "src/main.tsx",
                path: "src/main.tsx",
            },
            {
                complexity: 8,
                id: "src/pages/dashboard.tsx",
                path: "src/pages/dashboard.tsx",
            },
            {
                complexity: 8,
                id: "src/pages/settings.tsx",
                path: "src/pages/settings.tsx",
            },
            {
                complexity: 6,
                id: "src/components/theme-switch.tsx",
                path: "src/components/theme-switch.tsx",
            },
        ],
    },
    "backend-core/payment-worker": {
        dependencies: [
            {
                relationType: "import",
                source: "src/main.ts",
                target: "src/services/worker.ts",
            },
            {
                relationType: "import",
                source: "src/services/worker.ts",
                target: "src/services/retry.ts",
            },
            {
                relationType: "import",
                source: "src/services/worker.ts",
                target: "src/services/queue.ts",
            },
            {
                relationType: "import",
                source: "src/services/retry.ts",
                target: "src/lib/lock.ts",
            },
            {
                relationType: "import",
                source: "src/services/queue.ts",
                target: "src/lib/metrics.ts",
            },
            {
                relationType: "import",
                source: "src/services/queue.ts",
                target: "src/lib/error-codes.ts",
            },
        ],
        files: [
            {
                complexity: 18,
                id: "src/main.ts",
                path: "src/main.ts",
            },
            {
                complexity: 16,
                id: "src/services/queue.ts",
                path: "src/services/queue.ts",
            },
            {
                complexity: 13,
                id: "src/services/retry.ts",
                path: "src/services/retry.ts",
            },
            {
                complexity: 15,
                id: "src/services/worker.ts",
                path: "src/services/worker.ts",
            },
            {
                complexity: 7,
                id: "src/lib/error-codes.ts",
                path: "src/lib/error-codes.ts",
            },
            {
                complexity: 9,
                id: "src/lib/lock.ts",
                path: "src/lib/lock.ts",
            },
            {
                complexity: 12,
                id: "src/lib/metrics.ts",
                path: "src/lib/metrics.ts",
            },
        ],
    },
} as const

const FUNCTION_CLASS_CALL_VIEWS: Readonly<Record<string, IRepositoryFunctionCallProfile>> = {
    "platform-team/api-gateway": {
        callRelations: [
            {
                relationType: "calls",
                source: "authController.login",
                target: "sessionService.createSession",
            },
            {
                relationType: "uses",
                source: "authController.login",
                target: "auditService.record",
            },
            {
                relationType: "calls",
                source: "repoController.getRepo",
                target: "repoService.fetchRepository",
            },
            {
                relationType: "calls",
                source: "repoService.fetchRepository",
                target: "repoService.normalizeRepo",
            },
            {
                relationType: "calls",
                source: "notificationsService.send",
                target: "queueAdapter.enqueue",
            },
            {
                relationType: "calls",
                source: "repoService.fetchRepository",
                target: "metricsCollector.trackCall",
            },
            {
                relationType: "contains",
                source: "class AuthController",
                target: "authController.login",
            },
        ],
        nodes: [
            {
                complexity: 20,
                file: "src/api/auth.ts",
                id: "authController.login",
                kind: "function",
                name: "authController.login",
            },
            {
                complexity: 18,
                file: "src/services/session.ts",
                id: "sessionService.createSession",
                kind: "function",
                name: "sessionService.createSession",
            },
            {
                complexity: 10,
                file: "src/services/audit.ts",
                id: "auditService.record",
                kind: "function",
                name: "auditService.record",
            },
            {
                complexity: 16,
                file: "src/api/repository.ts",
                id: "repoController.getRepo",
                kind: "function",
                name: "repoController.getRepo",
            },
            {
                complexity: 22,
                file: "src/services/repository.ts",
                id: "repoService.fetchRepository",
                kind: "function",
                name: "repoService.fetchRepository",
            },
            {
                complexity: 12,
                file: "src/services/repository.ts",
                id: "repoService.normalizeRepo",
                kind: "function",
                name: "repoService.normalizeRepo",
            },
            {
                complexity: 11,
                file: "src/services/notifications.ts",
                id: "notificationsService.send",
                kind: "function",
                name: "notificationsService.send",
            },
            {
                complexity: 8,
                file: "src/adapters/queue.ts",
                id: "queueAdapter.enqueue",
                kind: "function",
                name: "queueAdapter.enqueue",
            },
            {
                complexity: 9,
                file: "src/services/metrics.ts",
                id: "metricsCollector.trackCall",
                kind: "function",
                name: "metricsCollector.trackCall",
            },
            {
                complexity: 14,
                file: "src/domain/auth-controller.ts",
                id: "class AuthController",
                kind: "class",
                name: "class AuthController",
            },
            {
                complexity: 9,
                file: "src/domain/auth-controller.ts",
                id: "AuthController.validate",
                kind: "method",
                name: "AuthController.validate",
            },
            {
                complexity: 10,
                file: "src/services/session.ts",
                id: "SessionService.authorize",
                kind: "method",
                name: "SessionService.authorize",
            },
        ],
    },
    "frontend-team/ui-dashboard": {
        callRelations: [
            {
                relationType: "calls",
                source: "router.bootstrap",
                target: "authGuard.requireAuth",
            },
            {
                relationType: "calls",
                source: "dashboardService.loadMetrics",
                target: "apiClient.fetchDashboard",
            },
            {
                relationType: "renders",
                source: "settingsPage.load",
                target: "settingsApi.getConfig",
            },
            {
                relationType: "mutates",
                source: "themeStore.setTheme",
                target: "localStorageAdapter.write",
            },
            {
                relationType: "calls",
                source: "apiClient.fetchDashboard",
                target: "httpClient.request",
            },
            {
                relationType: "calls",
                source: "dashboard.page",
                target: "dashboardService.loadMetrics",
            },
            {
                relationType: "uses",
                source: "ThemeSwitcher",
                target: "themeStore.setTheme",
            },
            {
                relationType: "uses",
                source: "ThemeSwitcher",
                target: "themeStore.current",
            },
            {
                relationType: "uses",
                source: "ThemeSwitcher",
                target: "documentStorage.updateMeta",
            },
        ],
        nodes: [
            {
                complexity: 16,
                file: "src/app/router.tsx",
                id: "router.bootstrap",
                kind: "function",
                name: "router.bootstrap",
            },
            {
                complexity: 11,
                file: "src/routes/auth.tsx",
                id: "authGuard.requireAuth",
                kind: "function",
                name: "authGuard.requireAuth",
            },
            {
                complexity: 19,
                file: "src/services/dashboard.ts",
                id: "dashboardService.loadMetrics",
                kind: "function",
                name: "dashboardService.loadMetrics",
            },
            {
                complexity: 14,
                file: "src/services/api.ts",
                id: "apiClient.fetchDashboard",
                kind: "function",
                name: "apiClient.fetchDashboard",
            },
            {
                complexity: 14,
                file: "src/components/dashboard.tsx",
                id: "dashboard.page",
                kind: "function",
                name: "dashboard.page",
            },
            {
                complexity: 8,
                file: "src/pages/settings.tsx",
                id: "settingsPage.load",
                kind: "function",
                name: "settingsPage.load",
            },
            {
                complexity: 17,
                file: "src/services/settings.ts",
                id: "settingsApi.getConfig",
                kind: "function",
                name: "settingsApi.getConfig",
            },
            {
                complexity: 13,
                file: "src/components/theme-switch.tsx",
                id: "ThemeSwitcher",
                kind: "class",
                name: "ThemeSwitcher",
            },
            {
                complexity: 13,
                file: "src/store/theme.ts",
                id: "themeStore.setTheme",
                kind: "function",
                name: "themeStore.setTheme",
            },
            {
                complexity: 10,
                file: "src/store/theme.ts",
                id: "themeStore.current",
                kind: "function",
                name: "themeStore.current",
            },
            {
                complexity: 9,
                file: "src/network/http.ts",
                id: "httpClient.request",
                kind: "function",
                name: "httpClient.request",
            },
            {
                complexity: 7,
                file: "src/utils/doc.ts",
                id: "documentStorage.updateMeta",
                kind: "function",
                name: "documentStorage.updateMeta",
            },
            {
                complexity: 12,
                file: "src/utils/storage.ts",
                id: "localStorageAdapter.write",
                kind: "function",
                name: "localStorageAdapter.write",
            },
        ],
    },
    "backend-core/payment-worker": {
        callRelations: [
            {
                relationType: "calls",
                source: "worker.run",
                target: "queueManager.poll",
            },
            {
                relationType: "calls",
                source: "queueManager.poll",
                target: "retryPolicy.shouldRetry",
            },
            {
                relationType: "calls",
                source: "queueManager.poll",
                target: "queueManager.dispatch",
            },
            {
                relationType: "calls",
                source: "queueManager.dispatch",
                target: "processorFactory.createProcessor",
            },
            {
                relationType: "calls",
                source: "queueManager.dispatch",
                target: "processorRegistry.resolve",
            },
            {
                relationType: "calls",
                source: "processorBase.process",
                target: "lockManager.acquire",
            },
            {
                relationType: "calls",
                source: "processorBase.process",
                target: "auditLogger.record",
            },
            {
                relationType: "delegates",
                source: "PaymentWorker",
                target: "worker.run",
            },
        ],
        nodes: [
            {
                complexity: 22,
                file: "src/main.ts",
                id: "worker.run",
                kind: "function",
                name: "worker.run",
            },
            {
                complexity: 18,
                file: "src/services/queue.ts",
                id: "queueManager.poll",
                kind: "function",
                name: "queueManager.poll",
            },
            {
                complexity: 16,
                file: "src/services/retry.ts",
                id: "retryPolicy.shouldRetry",
                kind: "method",
                name: "retryPolicy.shouldRetry",
            },
            {
                complexity: 20,
                file: "src/services/processor.ts",
                id: "queueManager.dispatch",
                kind: "function",
                name: "queueManager.dispatch",
            },
            {
                complexity: 14,
                file: "src/services/processor.ts",
                id: "processorFactory.createProcessor",
                kind: "function",
                name: "processorFactory.createProcessor",
            },
            {
                complexity: 15,
                file: "src/services/processor-registry.ts",
                id: "processorRegistry.resolve",
                kind: "function",
                name: "processorRegistry.resolve",
            },
            {
                complexity: 14,
                file: "src/services/processor-base.ts",
                id: "processorBase.process",
                kind: "method",
                name: "processorBase.process",
            },
            {
                complexity: 12,
                file: "src/services/lock.ts",
                id: "lockManager.acquire",
                kind: "function",
                name: "lockManager.acquire",
            },
            {
                complexity: 11,
                file: "src/services/audit.ts",
                id: "auditLogger.record",
                kind: "function",
                name: "auditLogger.record",
            },
            {
                complexity: 14,
                file: "src/services/worker.ts",
                id: "PaymentWorker",
                kind: "class",
                name: "PaymentWorker",
            },
            {
                complexity: 9,
                file: "src/services/worker.ts",
                id: "PaymentWorker.handleTask",
                kind: "method",
                name: "PaymentWorker.handleTask",
            },
        ],
    },
} as const

const PACKAGE_DEPENDENCY_VIEWS: Readonly<Record<string, IRepositoryPackageDependencyProfile>> = {
    "platform-team/api-gateway": {
        packageRelations: [
            {
                relationType: "runtime",
                source: "api-gateway::api",
                target: "shared::core",
            },
            {
                relationType: "runtime",
                source: "api-gateway::api",
                target: "shared::auth",
            },
            {
                relationType: "runtime",
                source: "api-gateway::worker-adapter",
                target: "shared::queue",
            },
            {
                relationType: "runtime",
                source: "api-gateway::worker-adapter",
                target: "shared::logging",
            },
            {
                relationType: "runtime",
                source: "api-gateway::api",
                target: "shared::logging",
            },
            {
                relationType: "runtime",
                source: "api-gateway::worker-adapter",
                target: "infrastructure::monitoring",
            },
            {
                relationType: "peer",
                source: "api-gateway::shared-models",
                target: "shared::core",
            },
            {
                relationType: "peer",
                source: "api-gateway::shared-models",
                target: "shared::auth",
            },
        ],
        nodes: [
            {
                id: "api-gateway::api",
                layer: "api",
                name: "api-gateway/api",
                size: 20,
            },
            {
                id: "api-gateway::worker-adapter",
                layer: "api",
                name: "api-gateway/worker-adapter",
                size: 16,
            },
            {
                id: "api-gateway::shared-models",
                layer: "core",
                name: "api-gateway/shared-models",
                size: 10,
            },
            {
                id: "shared::core",
                layer: "core",
                name: "shared/core",
                size: 27,
            },
            {
                id: "shared::auth",
                layer: "core",
                name: "shared/auth",
                size: 18,
            },
            {
                id: "shared::queue",
                layer: "infra",
                name: "shared/queue",
                size: 14,
            },
            {
                id: "shared::logging",
                layer: "infra",
                name: "shared/logging",
                size: 12,
            },
            {
                id: "infrastructure::monitoring",
                layer: "infra",
                name: "infrastructure/monitoring",
                size: 11,
            },
        ],
    },
    "frontend-team/ui-dashboard": {
        packageRelations: [
            {
                relationType: "runtime",
                source: "ui-dashboard::app",
                target: "ui-dashboard::routes",
            },
            {
                relationType: "runtime",
                source: "ui-dashboard::app",
                target: "ui-dashboard::components",
            },
            {
                relationType: "runtime",
                source: "ui-dashboard::components",
                target: "shared::ui-kit",
            },
            {
                relationType: "runtime",
                source: "ui-dashboard::services",
                target: "ui-dashboard::state",
            },
            {
                relationType: "runtime",
                source: "ui-dashboard::services",
                target: "shared::api-client",
            },
            {
                relationType: "runtime",
                source: "ui-dashboard::state",
                target: "shared::storage",
            },
            {
                relationType: "peer",
                source: "ui-dashboard::routes",
                target: "ui-dashboard::services",
            },
            {
                relationType: "peer",
                source: "ui-dashboard::app",
                target: "shared::theme",
            },
            {
                relationType: "runtime",
                source: "ui-dashboard::layout",
                target: "ui-dashboard::components",
            },
        ],
        nodes: [
            {
                id: "ui-dashboard::app",
                layer: "ui",
                name: "ui-dashboard/app",
                size: 22,
            },
            {
                id: "ui-dashboard::routes",
                layer: "ui",
                name: "ui-dashboard/routes",
                size: 16,
            },
            {
                id: "ui-dashboard::components",
                layer: "ui",
                name: "ui-dashboard/components",
                size: 27,
            },
            {
                id: "ui-dashboard::services",
                layer: "api",
                name: "ui-dashboard/services",
                size: 15,
            },
            {
                id: "ui-dashboard::state",
                layer: "core",
                name: "ui-dashboard/state",
                size: 18,
            },
            {
                id: "ui-dashboard::layout",
                layer: "ui",
                name: "ui-dashboard/layout",
                size: 12,
            },
            {
                id: "shared::ui-kit",
                layer: "ui",
                name: "shared/ui-kit",
                size: 24,
            },
            {
                id: "shared::api-client",
                layer: "api",
                name: "shared/api-client",
                size: 14,
            },
            {
                id: "shared::storage",
                layer: "infra",
                name: "shared/storage",
                size: 9,
            },
            {
                id: "shared::theme",
                layer: "ui",
                name: "shared/theme",
                size: 8,
            },
        ],
    },
    "backend-core/payment-worker": {
        packageRelations: [
            {
                relationType: "runtime",
                source: "payment-worker::handler",
                target: "payment-worker::queue",
            },
            {
                relationType: "runtime",
                source: "payment-worker::handler",
                target: "payment-worker::retry",
            },
            {
                relationType: "runtime",
                source: "payment-worker::queue",
                target: "shared::queue",
            },
            {
                relationType: "runtime",
                source: "payment-worker::processor",
                target: "payment-worker::services",
            },
            {
                relationType: "runtime",
                source: "payment-worker::processor",
                target: "shared::payments",
            },
            {
                relationType: "runtime",
                source: "payment-worker::services",
                target: "shared::storage",
            },
            {
                relationType: "peer",
                source: "shared::payments",
                target: "shared::security",
            },
            {
                relationType: "peer",
                source: "payment-worker::handler",
                target: "shared::security",
            },
            {
                relationType: "runtime",
                source: "payment-worker::monitoring",
                target: "infrastructure::monitoring",
            },
        ],
        nodes: [
            {
                id: "payment-worker::handler",
                layer: "worker",
                name: "payment-worker/handler",
                size: 20,
            },
            {
                id: "payment-worker::queue",
                layer: "worker",
                name: "payment-worker/queue",
                size: 18,
            },
            {
                id: "payment-worker::retry",
                layer: "worker",
                name: "payment-worker/retry",
                size: 10,
            },
            {
                id: "payment-worker::processor",
                layer: "worker",
                name: "payment-worker/processor",
                size: 21,
            },
            {
                id: "payment-worker::services",
                layer: "worker",
                name: "payment-worker/services",
                size: 16,
            },
            {
                id: "payment-worker::monitoring",
                layer: "infra",
                name: "payment-worker/monitoring",
                size: 9,
            },
            {
                id: "shared::queue",
                layer: "infra",
                name: "shared/queue",
                size: 14,
            },
            {
                id: "shared::payments",
                layer: "core",
                name: "shared/payments",
                size: 13,
            },
            {
                id: "shared::storage",
                layer: "db",
                name: "shared/storage",
                size: 15,
            },
            {
                id: "shared::security",
                layer: "core",
                name: "shared/security",
                size: 11,
            },
            {
                id: "infrastructure::monitoring",
                layer: "infra",
                name: "infrastructure/monitoring",
                size: 12,
            },
        ],
    },
} as const

const FALLBACK_FILE_DEPENDENCIES: IRepositoryFileDependencyProfile = {
    dependencies: [],
    files: [],
}

const FALLBACK_FUNCTION_CALL_GRAPH: IRepositoryFunctionCallProfile = {
    callRelations: [],
    nodes: [],
}

const FALLBACK_PACKAGE_DEPENDENCIES: IRepositoryPackageDependencyProfile = {
    nodes: [],
    packageRelations: [],
}

function clampScore(rawScore: number): number {
    if (rawScore < 0) {
        return 0
    }

    if (rawScore > 100) {
        return 100
    }

    return rawScore
}

function mapRiskToChipColor(risk: TRepositoryRisk): THighlight {
    if (risk === "low") {
        return "success"
    }

    if (risk === "high") {
        return "warning"
    }

    return "danger"
}

function mapRiskToLabel(risk: TRepositoryRisk): string {
    if (risk === "low") {
        return "low"
    }

    if (risk === "high") {
        return "high"
    }

    return "critical"
}

function getRepositoryOverviewById(repositoryId: string): IRepositoryOverviewProfile | undefined {
    return REPOSITORY_OVERVIEWS.find((entry): boolean => entry.id === repositoryId)
}

function getRepositoryFileDependencies(repositoryId: string): IRepositoryFileDependencyProfile {
    const repositoryDependencies = FILE_DEPENDENCY_VIEWS[repositoryId]
    return repositoryDependencies ?? FALLBACK_FILE_DEPENDENCIES
}

function getRepositoryFunctionCallGraph(repositoryId: string): IRepositoryFunctionCallProfile {
    const functionGraph = FUNCTION_CLASS_CALL_VIEWS[repositoryId]
    return functionGraph ?? FALLBACK_FUNCTION_CALL_GRAPH
}

function getRepositoryPackageDependencyGraph(
    repositoryId: string,
): IRepositoryPackageDependencyProfile {
    const packageGraph = PACKAGE_DEPENDENCY_VIEWS[repositoryId]
    return packageGraph ?? FALLBACK_PACKAGE_DEPENDENCIES
}

function formatOverviewTimestamp(raw: string): string {
    const date = new Date(raw)
    if (Number.isNaN(date.getTime()) === true) {
        return "—"
    }

    return date.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        second: "2-digit",
        year: "numeric",
    })
}

function createRangeValues(limit: number): ReadonlyArray<number> {
    const values: number[] = []
    for (let index = 0; index < limit; index += 1) {
        values.push(index)
    }
    return values
}

function padCronValue(value: number): string {
    return String(value).padStart(2, "0")
}

function parseCronNumber(value: string, min: number, max: number, fallback: number): number {
    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed) === true || parsed < min || parsed > max) {
        return fallback
    }
    return parsed
}

function getRepositoryDefaultSchedule(canonicalRepositoryId: string): string {
    const repository = getRepositoryOverviewById(canonicalRepositoryId)
    return repository?.defaultRescanCron ?? "manual"
}

function isCronManual(cronExpression: string): boolean {
    return cronExpression.trim() === "manual"
}

function createRescanScheduleFromCron(
    cronExpression: string,
): IRescanScheduleValues {
    if (isCronManual(cronExpression)) {
        return DEFAULT_RESCAN_VALUES
    }

    const values = cronExpression
        .trim()
        .split(/\s+/)
        .filter((value): boolean => value.length > 0)
    if (values.length !== 5) {
        return {
            ...DEFAULT_RESCAN_VALUES,
            mode: "custom",
            customCron: cronExpression.trim(),
        }
    }

    const minute = parseCronNumber(values[0], 0, 59, 0)
    const hour = parseCronNumber(values[1], 0, 23, 0)
    const weekDay = parseCronNumber(values[4], 0, 6, 0)
    const isHourPattern =
        values[1] === "*" && values[2] === "*" && values[3] === "*" && values[4] === "*"

    if (isHourPattern === true) {
        return {
            ...DEFAULT_RESCAN_VALUES,
            customCron: "",
            mode: "hourly",
            minute,
        }
    }

    const isDailyPattern =
        values[2] === "*" && values[3] === "*" && values[4] === "*"
    if (isDailyPattern === true) {
        return {
            ...DEFAULT_RESCAN_VALUES,
            customCron: "",
            hour,
            mode: "daily",
            minute,
        }
    }

    const isWeeklyPattern = values[2] === "*" && values[3] === "*"
    if (isWeeklyPattern === true) {
        return {
            ...DEFAULT_RESCAN_VALUES,
            customCron: "",
            hour,
            mode: "weekly",
            minute,
            weekday: weekDay,
        }
    }

    return {
        ...DEFAULT_RESCAN_VALUES,
        customCron: cronExpression.trim(),
        mode: "custom",
    }
}

function createCronExpressionFromReschedule(values: IRescanScheduleValues): string {
    if (values.mode === "manual") {
        return "manual"
    }

    if (values.mode === "hourly") {
        return `${values.minute} * * * *`
    }

    if (values.mode === "daily") {
        return `${values.minute} ${values.hour} * * *`
    }

    if (values.mode === "weekly") {
        return `${values.minute} ${values.hour} * * ${values.weekday}`
    }

    if (values.customCron.trim().length === 0) {
        return "manual"
    }

    return values.customCron.trim().replace(/\s+/g, " ")
}

function getRescanSummaryLabel(values: IRescanScheduleValues): string {
    if (values.mode === "manual") {
        return "По требованию"
    }

    if (values.mode === "hourly") {
        return `Ежечасно в :${padCronValue(values.minute)}`
    }

    if (values.mode === "daily") {
        return `Ежедневно в ${padCronValue(values.hour)}:${padCronValue(values.minute)}`
    }

    if (values.mode === "weekly") {
        const weekdayLabel = WEEKDAYS_TO_LABELS[values.weekday]
        return `Еженедельно, ${weekdayLabel} в ${padCronValue(values.hour)}:${padCronValue(values.minute)}`
    }

    if (values.customCron.trim().length === 0) {
        return "Кастомный cron не задан"
    }

    return `Кастомный cron: ${values.customCron.trim()}`
}

function isRescanScheduleMode(value: string): value is TRescanScheduleMode {
    return RESCAN_FREQUENCY_OPTIONS.some((entry): boolean => entry.value === value)
}

function resolveHealthChipColor(score: number): THighlight {
    if (score >= 85) {
        return "success"
    }

    if (score >= 70) {
        return "warning"
    }

    return "danger"
}

function resolveHealthLabel(score: number): string {
    if (score >= 85) {
        return "Healthy"
    }

    if (score >= 70) {
        return "Degraded"
    }

    return "At risk"
}

function RepositoryHealthScore(props: { score: number }): ReactElement {
    const score = clampScore(props.score)
    const chipColor = resolveHealthChipColor(score)
    const progressColor =
        chipColor === "success"
            ? "bg-emerald-500"
            : chipColor === "warning"
              ? "bg-amber-500"
              : "bg-rose-500"

    return (
        <section
            aria-label="Repository health score"
            className="rounded-lg border border-slate-200 p-3"
        >
            <div className="flex items-end justify-between">
                <p className="text-sm font-semibold text-slate-700">Health score</p>
                <Chip color={chipColor} size="sm">
                    {resolveHealthLabel(score)}
                </Chip>
            </div>
            <div className="mt-3">
                <div className="mb-1 text-3xl font-semibold text-slate-900">{score}</div>
                <div
                    aria-label={`Health score ${score}`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={score}
                    className="h-2.5 w-full rounded-full bg-slate-200"
                    role="meter"
                >
                    <span
                        className={`block h-2.5 rounded-full ${progressColor}`}
                        style={{ width: `${score}%` }}
                    />
                </div>
            </div>
        </section>
    )
}

function TechnologyStackList(props: { stack: ReadonlyArray<ITechStackItem> }): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className="text-sm font-semibold text-slate-900">Tech stack</p>
            </CardHeader>
            <CardBody className="space-y-3">
                {props.stack.map((entry): ReactElement => (
                    <div className="space-y-0.5" key={`${entry.name}-${entry.version}`}>
                        <p className="text-sm font-semibold text-slate-900">
                            {entry.name} <span className="font-normal">{entry.version}</span>
                        </p>
                        <p className="text-sm text-slate-600">{entry.note}</p>
                    </div>
                ))}
            </CardBody>
        </Card>
    )
}

function ArchitectureSummaryList(props: {
    lines: ReadonlyArray<IArchitectureSummary>
}): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className="text-sm font-semibold text-slate-900">Architecture summary</p>
            </CardHeader>
            <CardBody className="space-y-3">
                {props.lines.map((line): ReactElement => {
                    const chipColor = mapRiskToChipColor(line.risk)
                    return (
                        <section
                            className="rounded-lg border border-slate-200 p-3"
                            key={line.area}
                        >
                            <div className="mb-1 flex items-center gap-2">
                                <Chip color={chipColor} size="sm">
                                    {mapRiskToLabel(line.risk)}
                                </Chip>
                                <p className="text-sm font-semibold text-slate-900">
                                    {line.area}
                                </p>
                            </div>
                            <p className="text-sm text-slate-600">{line.summary}</p>
                        </section>
                    )
                })}
            </CardBody>
        </Card>
    )
}

function RepositoryOverviewNotFound(props: { repositoryId: string }): ReactElement {
    return (
        <section className="space-y-3">
            <Alert color="warning">Скан-результат репозитория не найден</Alert>
                <p className="text-sm text-slate-700">
                    Не найдено overview для ID:{" "}
                    <span className="font-semibold">{props.repositoryId}</span>.
                </p>
            <Link className="text-sm underline underline-offset-4" to="/repositories">
                К списку репозиториев
            </Link>
        </section>
    )
}

/**
 * Подробный dashboard по одному репозиторию после скана.
 *
 * @param props Идентификатор репозитория.
 * @returns Страница с метриками, архитектурным резюме и health score.
 */
export function RepositoryOverviewPage(props: IRepositoryOverviewProps): ReactElement {
    const repository = getRepositoryOverviewById(props.repositoryId)
    const defaultReschedule = createRescanScheduleFromCron(
        getRepositoryDefaultSchedule(props.repositoryId),
    )

    const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState<boolean>(false)
    const [currentReschedule, setCurrentReschedule] = useState<IRescanScheduleValues>(
        defaultReschedule,
    )
    const [draftReschedule, setDraftReschedule] = useState<IRescanScheduleValues>(
        defaultReschedule,
    )

    useEffect((): void => {
        const nextReschedule = createRescanScheduleFromCron(
            getRepositoryDefaultSchedule(props.repositoryId),
        )
        setCurrentReschedule(nextReschedule)
        setDraftReschedule(nextReschedule)
    }, [props.repositoryId])

    const currentCron = createCronExpressionFromReschedule(currentReschedule)
    const draftCron = createCronExpressionFromReschedule(draftReschedule)
    const isSaveButtonDisabled =
        draftReschedule.mode === "custom" && draftReschedule.customCron.trim().length === 0

    const openRescheduleDialog = (): void => {
        setDraftReschedule(currentReschedule)
        setIsRescheduleDialogOpen(true)
    }

    const closeRescheduleDialog = (): void => {
        setIsRescheduleDialogOpen(false)
    }

    const saveReschedule = (): void => {
        if (isSaveButtonDisabled === true) {
            return
        }

        const next = createRescanScheduleFromCron(draftCron)
        setCurrentReschedule(next)
        setIsRescheduleDialogOpen(false)

        if (props.onRescanScheduleChange !== undefined) {
            props.onRescanScheduleChange({
                cronExpression: createCronExpressionFromReschedule(next),
                mode: next.mode,
                repositoryId: props.repositoryId,
            })
        }
    }

    const updateRescheduleMode = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextMode = event.currentTarget.value
        if (isRescanScheduleMode(nextMode) === false) {
            return
        }

        setDraftReschedule((previous): IRescanScheduleValues => ({
            ...previous,
            mode: nextMode,
        }))
    }

    const updateRescheduleMinute = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextMinute = parseCronNumber(event.currentTarget.value, 0, 59, draftReschedule.minute)
        setDraftReschedule((previous): IRescanScheduleValues => ({
            ...previous,
            minute: nextMinute,
        }))
    }

    const updateRescheduleHour = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextHour = parseCronNumber(event.currentTarget.value, 0, 23, draftReschedule.hour)
        setDraftReschedule((previous): IRescanScheduleValues => ({
            ...previous,
            hour: nextHour,
        }))
    }

    const updateRescheduleWeekday = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextWeekday = parseCronNumber(event.currentTarget.value, 0, 6, draftReschedule.weekday)
        setDraftReschedule((previous): IRescanScheduleValues => ({
            ...previous,
            weekday: nextWeekday,
        }))
    }

    const updateRescheduleCustomCron = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        const nextCustomCron = event.currentTarget.value
        setDraftReschedule((previous): IRescanScheduleValues => ({
            ...previous,
            customCron: nextCustomCron,
        }))
    }

    if (repository === undefined) {
        return <RepositoryOverviewNotFound repositoryId={props.repositoryId} />
    }

    const fallbackSummary =
        repository.architectureSummary.length === 0
            ? FALLBACK_ARCHITECTURE_SUMMARY
            : repository.architectureSummary
    const fileDependencyGraph = getRepositoryFileDependencies(repository.id)
    const functionCallGraph = getRepositoryFunctionCallGraph(repository.id)
    const packageDependencyGraph = getRepositoryPackageDependencyGraph(repository.id)

    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <p className="text-sm text-slate-500">Post-scan dashboard</p>
                <h1 className="text-2xl font-semibold text-slate-900">
                    {repository.owner}/{repository.name}
                </h1>
                <p className="text-sm text-slate-600">
                    Отображение health score, архитектуры и ключевых метрик после последнего
                    сканирования.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Scan snapshot</p>
                </CardHeader>
                <CardBody className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-sm text-slate-700">Branch: {repository.branch}</p>
                        <p className="text-sm text-slate-700">
                            Last scan: {formatOverviewTimestamp(repository.lastScanAt)}
                        </p>
                        <p className="text-sm text-slate-700">
                            Scanned files: {repository.filesScanned}
                        </p>
                        <p className="text-sm text-slate-700">
                            Total findings: {repository.totalFindings}
                        </p>
                        <p className="text-sm text-slate-700">
                            Rescan schedule: {getRescanSummaryLabel(currentReschedule)}
                        </p>
                        <p className="text-sm font-mono text-slate-700">Cron: {currentCron}</p>
                        <Button
                            onPress={openRescheduleDialog}
                            className="mt-1"
                            color="primary"
                            type="button"
                        >
                            Настроить расписание рескана
                        </Button>
                    </div>
                    <RepositoryHealthScore score={repository.healthScore} />
                </CardBody>
            </Card>

            {isRescheduleDialogOpen === true ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
                    <div
                        aria-labelledby="rescan-schedule-title"
                        aria-modal="true"
                        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-4"
                        role="dialog"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-semibold" id="rescan-schedule-title">
                                Настройка периодического рескана
                            </h2>
                            <button
                                aria-label="Закрыть"
                                className="rounded-md border border-slate-200 px-3 py-1 text-sm"
                                onClick={closeRescheduleDialog}
                                type="button"
                            >
                                ×
                            </button>
                        </div>

                        <p className="mb-4 text-sm text-slate-600">
                            Последний scan: {formatOverviewTimestamp(repository.lastScanAt)}
                        </p>

                        <div className="space-y-2">
                            <label className="text-sm text-slate-700" htmlFor="rescan-mode">
                                Режим
                            </label>
                            <select
                                aria-label="Режим расписания рескана"
                                className="w-full rounded-md border border-slate-200 px-3 py-2"
                                id="rescan-mode"
                                onChange={updateRescheduleMode}
                                value={draftReschedule.mode}
                            >
                                {RESCAN_FREQUENCY_OPTIONS.map(
                                    (entry): ReactElement => (
                                        <option value={entry.value} key={entry.value}>
                                            {entry.label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>

                        {draftReschedule.mode !== "manual" && draftReschedule.mode !== "custom" ? (
                            <>
                                <div className="mt-3 space-y-2">
                                    <label
                                        className="text-sm text-slate-700"
                                        htmlFor="rescan-minute"
                                    >
                                        Минуты
                                    </label>
                                    <select
                                        aria-label="Минута"
                                        className="w-full rounded-md border border-slate-200 px-3 py-2"
                                        id="rescan-minute"
                                        onChange={updateRescheduleMinute}
                                        value={draftReschedule.minute}
                                    >
                                        {RESCAN_MINUTE_OPTIONS.map(
                                            (minute): ReactElement => (
                                                <option value={minute} key={`minute-${minute}`}>
                                                    {padCronValue(minute)}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                {draftReschedule.mode !== "hourly" ? (
                                    <div className="mt-3 space-y-2">
                                        <label
                                            className="text-sm text-slate-700"
                                            htmlFor="rescan-hour"
                                        >
                                            Час
                                        </label>
                                        <select
                                            aria-label="Час"
                                            className="w-full rounded-md border border-slate-200 px-3 py-2"
                                            id="rescan-hour"
                                            onChange={updateRescheduleHour}
                                            value={draftReschedule.hour}
                                        >
                                            {RESCAN_HOUR_OPTIONS.map(
                                                (hour): ReactElement => (
                                                    <option value={hour} key={`hour-${hour}`}>
                                                        {padCronValue(hour)}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                ) : null}
                            </>
                        ) : null}

                        {draftReschedule.mode === "weekly" ? (
                            <div className="mt-3 space-y-2">
                                <label
                                    className="text-sm text-slate-700"
                                    htmlFor="rescan-weekday"
                                >
                                    День недели
                                </label>
                                <select
                                    aria-label="День недели"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2"
                                    id="rescan-weekday"
                                    onChange={updateRescheduleWeekday}
                                    value={draftReschedule.weekday}
                                >
                                    {RESCAN_WEEKDAY_OPTIONS.map(
                                        (option): ReactElement => (
                                            <option value={option.value} key={option.value}>
                                                {option.label}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                        ) : null}

                        {draftReschedule.mode === "custom" ? (
                            <div className="mt-3 space-y-2">
                                <label
                                    className="text-sm text-slate-700"
                                    htmlFor="rescan-custom-cron"
                                >
                                    Cron-выражение
                                </label>
                                <input
                                    aria-label="Кастомное cron-выражение"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2"
                                    id="rescan-custom-cron"
                                    onChange={updateRescheduleCustomCron}
                                    value={draftReschedule.customCron}
                                    type="text"
                                />
                            </div>
                        ) : null}

                        <p className="mt-4 rounded bg-slate-50 p-2 text-xs text-slate-700">
                            Cron preview: <code>{draftCron}</code>
                        </p>

                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                color="default"
                                onPress={closeRescheduleDialog}
                                type="button"
                                variant="light"
                            >
                                Отменить
                            </Button>
                            <Button
                                color="primary"
                                isDisabled={isSaveButtonDisabled}
                                onPress={saveReschedule}
                                type="button"
                            >
                                Сохранить расписание
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}

            <section aria-label="Key metrics">
                <MetricsGrid metrics={repository.keyMetrics} />
            </section>

            <div className="grid gap-4 md:grid-cols-2">
                <ArchitectureSummaryList lines={fallbackSummary} />
                <TechnologyStackList stack={repository.techStack} />
            </div>

            <FileDependencyGraph
                dependencies={fileDependencyGraph.dependencies}
                files={fileDependencyGraph.files}
                height="460px"
                showControls
                showMiniMap
                title="File dependency graph"
            />
            <FunctionClassCallGraph
                callRelations={functionCallGraph.callRelations}
                height="420px"
                nodes={functionCallGraph.nodes}
                showControls
                showMiniMap
                title="Function/Class call graph"
            />
            <PackageDependencyGraph
                height="420px"
                nodes={packageDependencyGraph.nodes}
                packageRelations={packageDependencyGraph.packageRelations}
                showControls
                showMiniMap
                title="Package dependency graph"
            />
        </section>
    )
}
