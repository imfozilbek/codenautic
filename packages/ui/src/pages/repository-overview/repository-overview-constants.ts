import { createRangeValues } from "./repository-overview-utils"
import type {
    IArchitectureSummary,
    IRepositoryFileDependencyProfile,
    IRepositoryFunctionCallProfile,
    IRepositoryPackageDependencyProfile,
    IRescanScheduleOption,
    IRescanScheduleValues,
    IRescanWeekdayOption,
} from "./repository-overview-types"

/**
 * Допустимые значения часов для выбора в расписании (0-23).
 */
export const RESCAN_HOUR_OPTIONS: ReadonlyArray<number> = createRangeValues(24)

/**
 * Допустимые значения минут для выбора в расписании (0-59).
 */
export const RESCAN_MINUTE_OPTIONS: ReadonlyArray<number> = createRangeValues(60)

/**
 * Опции выбора режима расписания рескана.
 */
export const RESCAN_FREQUENCY_OPTIONS: ReadonlyArray<IRescanScheduleOption> = [
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

/**
 * Опции выбора дня недели для расписания.
 */
export const RESCAN_WEEKDAY_OPTIONS: ReadonlyArray<IRescanWeekdayOption> = [
    { label: "Воскресенье", value: 0 },
    { label: "Понедельник", value: 1 },
    { label: "Вторник", value: 2 },
    { label: "Среда", value: 3 },
    { label: "Четверг", value: 4 },
    { label: "Пятница", value: 5 },
    { label: "Суббота", value: 6 },
]

/**
 * Значения расписания по умолчанию (ручной режим).
 */
export const DEFAULT_RESCAN_VALUES: IRescanScheduleValues = {
    customCron: "",
    hour: 8,
    minute: 0,
    mode: "manual",
    weekday: 1,
} as const

/**
 * Маппинг числового дня недели в русскоязычную метку.
 */
export const WEEKDAYS_TO_LABELS: Readonly<Record<number, string>> = {
    0: "Воскресенье",
    1: "Понедельник",
    2: "Вторник",
    3: "Среда",
    4: "Четверг",
    5: "Пятница",
    6: "Суббота",
}

/**
 * Fallback для архитектурного резюме при отсутствии данных.
 */
export const FALLBACK_ARCHITECTURE_SUMMARY: ReadonlyArray<IArchitectureSummary> = [
    {
        area: "Repository overview",
        risk: "critical",
        summary: "Информация по репозиторию отсутствует, требуется " + "повторно запустить скан.",
    },
]

/**
 * Демо-данные количества issues по файлам для heatmap.
 */
export const FILE_ISSUE_HEATMAP_COUNTS: Readonly<Record<string, number>> = {
    "src/api/auth.ts": 4,
    "src/api/repository.ts": 2,
    "src/api/server.ts": 3,
    "src/api/notifications.ts": 1,
    "src/app.tsx": 2,
    "src/app/router.tsx": 1,
    "src/pages/dashboard.tsx": 5,
    "src/pages/settings.tsx": 1,
    "src/components/app-shell.tsx": 3,
    "src/components/theme-switch.tsx": 1,
    "src/main.ts": 2,
    "src/services/worker.ts": 4,
    "src/services/queue.ts": 2,
    "src/services/retry.ts": 1,
    "src/lib/lock.ts": 2,
    "src/lib/metrics.ts": 1,
    "src/lib/error-codes.ts": 3,
    "src/lib/config.ts": 1,
    "src/lib/logger.ts": 1,
    "src/main.tsx": 1,
}

/**
 * Fallback для отсутствующих файловых зависимостей.
 */
export const FALLBACK_FILE_DEPENDENCIES: IRepositoryFileDependencyProfile = {
    dependencies: [],
    files: [],
}

/**
 * Fallback для отсутствующего графа вызовов.
 */
export const FALLBACK_FUNCTION_CALL_GRAPH: IRepositoryFunctionCallProfile = {
    callRelations: [],
    nodes: [],
}

/**
 * Fallback для отсутствующих зависимостей пакетов.
 */
export const FALLBACK_PACKAGE_DEPENDENCIES: IRepositoryPackageDependencyProfile = {
    nodes: [],
    packageRelations: [],
}

/**
 * Демо-данные файловых зависимостей по репозиториям.
 */
export const FILE_DEPENDENCY_VIEWS: Readonly<Record<string, IRepositoryFileDependencyProfile>> = {
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

/**
 * Демо-данные графа вызовов функций и классов по репозиториям.
 */
export const FUNCTION_CLASS_CALL_VIEWS: Readonly<
    Record<string, IRepositoryFunctionCallProfile>
> = {
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

/**
 * Демо-данные графа зависимостей пакетов по репозиториям.
 */
export const PACKAGE_DEPENDENCY_VIEWS: Readonly<
    Record<string, IRepositoryPackageDependencyProfile>
> = {
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
            { id: "api-gateway::api", layer: "api", name: "api-gateway/api", size: 20 },
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
            { id: "shared::core", layer: "core", name: "shared/core", size: 27 },
            { id: "shared::auth", layer: "core", name: "shared/auth", size: 18 },
            { id: "shared::queue", layer: "infra", name: "shared/queue", size: 14 },
            { id: "shared::logging", layer: "infra", name: "shared/logging", size: 12 },
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
            { id: "ui-dashboard::app", layer: "ui", name: "ui-dashboard/app", size: 22 },
            { id: "ui-dashboard::routes", layer: "ui", name: "ui-dashboard/routes", size: 16 },
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
            { id: "ui-dashboard::state", layer: "core", name: "ui-dashboard/state", size: 18 },
            { id: "ui-dashboard::layout", layer: "ui", name: "ui-dashboard/layout", size: 12 },
            { id: "shared::ui-kit", layer: "ui", name: "shared/ui-kit", size: 24 },
            { id: "shared::api-client", layer: "api", name: "shared/api-client", size: 14 },
            { id: "shared::storage", layer: "infra", name: "shared/storage", size: 9 },
            { id: "shared::theme", layer: "ui", name: "shared/theme", size: 8 },
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
            { id: "shared::queue", layer: "infra", name: "shared/queue", size: 14 },
            { id: "shared::payments", layer: "core", name: "shared/payments", size: 13 },
            { id: "shared::storage", layer: "db", name: "shared/storage", size: 15 },
            { id: "shared::security", layer: "core", name: "shared/security", size: 11 },
            {
                id: "infrastructure::monitoring",
                layer: "infra",
                name: "infrastructure/monitoring",
                size: 12,
            },
        ],
    },
} as const

/**
 * Возвращает профиль файловых зависимостей по ID репозитория.
 *
 * @param repositoryId Идентификатор репозитория.
 * @returns Профиль зависимостей или fallback.
 */
export function getRepositoryFileDependencies(
    repositoryId: string,
): IRepositoryFileDependencyProfile {
    const repositoryDependencies = FILE_DEPENDENCY_VIEWS[repositoryId]
    return repositoryDependencies ?? FALLBACK_FILE_DEPENDENCIES
}

/**
 * Возвращает профиль call-graph по ID репозитория.
 *
 * @param repositoryId Идентификатор репозитория.
 * @returns Профиль вызовов или fallback.
 */
export function getRepositoryFunctionCallGraph(
    repositoryId: string,
): IRepositoryFunctionCallProfile {
    const functionGraph = FUNCTION_CLASS_CALL_VIEWS[repositoryId]
    return functionGraph ?? FALLBACK_FUNCTION_CALL_GRAPH
}

/**
 * Возвращает профиль зависимостей пакетов по ID репозитория.
 *
 * @param repositoryId Идентификатор репозитория.
 * @returns Профиль пакетных зависимостей или fallback.
 */
export function getRepositoryPackageDependencyGraph(
    repositoryId: string,
): IRepositoryPackageDependencyProfile {
    const packageGraph = PACKAGE_DEPENDENCY_VIEWS[repositoryId]
    return packageGraph ?? FALLBACK_PACKAGE_DEPENDENCIES
}
