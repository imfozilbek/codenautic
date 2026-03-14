import type {
    IPackageDependencyNode,
    IPackageDependencyRelation,
} from "@/components/graphs/package-dependency-graph"
import type { IGuidedTourStep } from "@/components/graphs/guided-tour-overlay"

import type {
    ICodeCityDashboardMetricOption,
    ICodeCityDashboardRepositoryProfile,
    ICodeCityDashboardOnboardingAreaDescriptor,
} from "./code-city-dashboard-types"

/**
 * Набор доступных метрик для dashboard селектора.
 */
export const CODE_CITY_DASHBOARD_METRICS: ReadonlyArray<ICodeCityDashboardMetricOption> = [
    {
        label: "Complexity",
        value: "complexity",
    },
    {
        label: "Coverage",
        value: "coverage",
    },
    {
        label: "Churn",
        value: "churn",
    },
] as const

/**
 * Демо-данные репозиториев для CodeCity dashboard.
 */
export const CODE_CITY_DASHBOARD_REPOSITORIES: ReadonlyArray<ICodeCityDashboardRepositoryProfile> =
    [
        {
            description: "Backend сервис с активной CCR-маршрутизацией и API слоями.",
            id: "platform-team/api-gateway",
            impactedFiles: [
                {
                    fileId: "src/api/repository.ts",
                    impactType: "changed",
                },
                {
                    fileId: "src/api/router.ts",
                    impactType: "impacted",
                },
                {
                    fileId: "src/services/metrics.ts",
                    impactType: "ripple",
                },
            ],
            temporalCouplings: [
                {
                    sourceFileId: "src/api/auth.ts",
                    targetFileId: "src/api/repository.ts",
                    strength: 0.82,
                },
                {
                    sourceFileId: "src/api/repository.ts",
                    targetFileId: "src/worker/index.ts",
                    strength: 0.56,
                },
            ],
            healthTrend: [
                {
                    timestamp: "2025-10-20T00:00:00.000Z",
                    healthScore: 61,
                    annotation: "Incident",
                },
                {
                    timestamp: "2025-11-15T00:00:00.000Z",
                    healthScore: 66,
                },
                {
                    timestamp: "2025-12-20T00:00:00.000Z",
                    healthScore: 72,
                    annotation: "Cache tuning",
                },
                {
                    timestamp: "2026-01-18T00:00:00.000Z",
                    healthScore: 78,
                },
                {
                    timestamp: "2026-02-01T00:00:00.000Z",
                    healthScore: 82,
                    annotation: "Retry refactor",
                },
            ],
            contributors: [
                {
                    ownerId: "neo",
                    ownerName: "Neo",
                    color: "#0f766e",
                    commitCount: 42,
                },
                {
                    ownerId: "trinity",
                    ownerName: "Trinity",
                    color: "#2563eb",
                    commitCount: 26,
                },
                {
                    ownerId: "morpheus",
                    ownerName: "Morpheus",
                    color: "#be123c",
                    commitCount: 13,
                },
            ],
            contributorCollaborations: [
                {
                    sourceOwnerId: "neo",
                    targetOwnerId: "trinity",
                    coAuthorCount: 9,
                },
                {
                    sourceOwnerId: "neo",
                    targetOwnerId: "morpheus",
                    coAuthorCount: 4,
                },
                {
                    sourceOwnerId: "trinity",
                    targetOwnerId: "morpheus",
                    coAuthorCount: 3,
                },
            ],
            ownership: [
                {
                    fileId: "src/api/auth.ts",
                    ownerId: "neo",
                },
                {
                    fileId: "src/api/repository.ts",
                    ownerId: "neo",
                },
                {
                    fileId: "src/worker/index.ts",
                    ownerId: "trinity",
                },
            ],
            label: "platform-team/api-gateway",
            files: [
                {
                    churn: 4,
                    complexity: 28,
                    coverage: 82,
                    id: "src/api/auth.ts",
                    issueCount: 3,
                    bugIntroductions: { "7d": 1, "30d": 3, "90d": 6 },
                    lastReviewAt: "2026-01-05T08:20:00Z",
                    loc: 96,
                    path: "src/api/auth.ts",
                },
                {
                    churn: 2,
                    complexity: 16,
                    coverage: 71,
                    id: "src/api/repository.ts",
                    issueCount: 2,
                    bugIntroductions: { "7d": 2, "30d": 4, "90d": 7 },
                    lastReviewAt: "2026-02-01T11:30:00Z",
                    loc: 126,
                    path: "src/api/repository.ts",
                },
                {
                    churn: 6,
                    complexity: 34,
                    coverage: 60,
                    id: "src/worker/index.ts",
                    issueCount: 0,
                    bugIntroductions: { "7d": 0, "30d": 2, "90d": 5 },
                    lastReviewAt: "2026-02-10T10:15:00Z",
                    loc: 138,
                    path: "src/worker/index.ts",
                },
            ],
            compareFiles: [
                {
                    complexity: 24,
                    id: "src/api/auth.ts",
                    issueCount: 4,
                    loc: 86,
                    path: "src/api/auth.ts",
                },
                {
                    complexity: 14,
                    id: "src/api/repository.ts",
                    issueCount: 3,
                    loc: 108,
                    path: "src/api/repository.ts",
                },
                {
                    complexity: 12,
                    id: "src/services/metrics.ts",
                    issueCount: 1,
                    loc: 60,
                    path: "src/services/metrics.ts",
                },
            ],
        },
        {
            description: "Frontend SPA для управления pipeline и наблюдаемостью.",
            id: "frontend-team/ui-dashboard",
            impactedFiles: [
                {
                    fileId: "src/pages/ccr-management.page.tsx",
                    impactType: "changed",
                },
                {
                    fileId: "src/components/layout/sidebar.tsx",
                    impactType: "changed",
                },
                {
                    fileId: "src/components/graphs/codecity-treemap.tsx",
                    impactType: "impacted",
                },
            ],
            temporalCouplings: [
                {
                    sourceFileId: "src/pages/ccr-management.page.tsx",
                    targetFileId: "src/components/graphs/codecity-treemap.tsx",
                    strength: 0.74,
                },
                {
                    sourceFileId: "src/components/layout/sidebar.tsx",
                    targetFileId: "src/pages/repositories-list.page.tsx",
                    strength: 0.48,
                },
            ],
            healthTrend: [
                {
                    timestamp: "2025-10-20T00:00:00.000Z",
                    healthScore: 70,
                },
                {
                    timestamp: "2025-11-15T00:00:00.000Z",
                    healthScore: 73,
                    annotation: "UI migration",
                },
                {
                    timestamp: "2025-12-20T00:00:00.000Z",
                    healthScore: 76,
                },
                {
                    timestamp: "2026-01-18T00:00:00.000Z",
                    healthScore: 81,
                },
                {
                    timestamp: "2026-02-01T00:00:00.000Z",
                    healthScore: 85,
                    annotation: "HeroUI rollout",
                },
            ],
            contributors: [
                {
                    ownerId: "niobe",
                    ownerName: "Niobe",
                    color: "#0f766e",
                    commitCount: 51,
                },
                {
                    ownerId: "tank",
                    ownerName: "Tank",
                    color: "#2563eb",
                    commitCount: 37,
                },
                {
                    ownerId: "switch",
                    ownerName: "Switch",
                    color: "#ca8a04",
                    commitCount: 23,
                },
            ],
            contributorCollaborations: [
                {
                    sourceOwnerId: "niobe",
                    targetOwnerId: "tank",
                    coAuthorCount: 11,
                },
                {
                    sourceOwnerId: "tank",
                    targetOwnerId: "switch",
                    coAuthorCount: 6,
                },
                {
                    sourceOwnerId: "niobe",
                    targetOwnerId: "switch",
                    coAuthorCount: 5,
                },
            ],
            ownership: [
                {
                    fileId: "src/pages/ccr-management.page.tsx",
                    ownerId: "niobe",
                },
                {
                    fileId: "src/components/graphs/codecity-treemap.tsx",
                    ownerId: "tank",
                },
                {
                    fileId: "src/components/layout/sidebar.tsx",
                    ownerId: "switch",
                },
                {
                    fileId: "src/pages/repositories-list.page.tsx",
                    ownerId: "niobe",
                },
            ],
            label: "frontend-team/ui-dashboard",
            files: [
                {
                    churn: 5,
                    complexity: 14,
                    coverage: 88,
                    id: "src/pages/ccr-management.page.tsx",
                    issueCount: 1,
                    bugIntroductions: { "7d": 1, "30d": 2, "90d": 3 },
                    lastReviewAt: "2026-01-12T16:40:00Z",
                    loc: 112,
                    path: "src/pages/ccr-management.page.tsx",
                },
                {
                    churn: 1,
                    complexity: 18,
                    coverage: 90,
                    id: "src/components/graphs/codecity-treemap.tsx",
                    issueCount: 0,
                    bugIntroductions: { "7d": 0, "30d": 1, "90d": 2 },
                    lastReviewAt: "2026-02-07T09:00:00Z",
                    loc: 142,
                    path: "src/components/graphs/codecity-treemap.tsx",
                },
                {
                    churn: 3,
                    complexity: 11,
                    coverage: 94,
                    id: "src/components/layout/sidebar.tsx",
                    issueCount: 2,
                    bugIntroductions: { "7d": 1, "30d": 3, "90d": 4 },
                    lastReviewAt: "2026-02-09T13:55:00Z",
                    loc: 64,
                    path: "src/components/layout/sidebar.tsx",
                },
                {
                    churn: 0,
                    complexity: 22,
                    coverage: 81,
                    id: "src/pages/repositories-list.page.tsx",
                    issueCount: 1,
                    bugIntroductions: { "7d": 1, "30d": 2, "90d": 5 },
                    lastReviewAt: "2026-02-10T14:10:00Z",
                    loc: 188,
                    path: "src/pages/repositories-list.page.tsx",
                },
            ],
            compareFiles: [
                {
                    complexity: 10,
                    id: "src/pages/ccr-management.page.tsx",
                    issueCount: 1,
                    loc: 98,
                    path: "src/pages/ccr-management.page.tsx",
                },
                {
                    complexity: 16,
                    id: "src/components/layout/sidebar.tsx",
                    issueCount: 0,
                    loc: 56,
                    path: "src/components/layout/sidebar.tsx",
                },
                {
                    complexity: 20,
                    id: "src/pages/system-health.page.tsx",
                    issueCount: 3,
                    loc: 130,
                    path: "src/pages/system-health.page.tsx",
                },
            ],
        },
        {
            description: "Worker-пайплайн с повышенными очередями и задачами background-обработки.",
            id: "backend-core/payment-worker",
            impactedFiles: [
                {
                    fileId: "src/adapters/queue.ts",
                    impactType: "changed",
                },
                {
                    fileId: "src/services/retry.ts",
                    impactType: "impacted",
                },
            ],
            temporalCouplings: [
                {
                    sourceFileId: "src/adapters/queue.ts",
                    targetFileId: "src/services/retry.ts",
                    strength: 0.91,
                },
                {
                    sourceFileId: "src/services/retry.ts",
                    targetFileId: "src/worker/main.ts",
                    strength: 0.42,
                },
            ],
            healthTrend: [
                {
                    timestamp: "2025-10-20T00:00:00.000Z",
                    healthScore: 57,
                    annotation: "Queue spike",
                },
                {
                    timestamp: "2025-11-15T00:00:00.000Z",
                    healthScore: 60,
                },
                {
                    timestamp: "2025-12-20T00:00:00.000Z",
                    healthScore: 65,
                },
                {
                    timestamp: "2026-01-18T00:00:00.000Z",
                    healthScore: 69,
                    annotation: "Backpressure patch",
                },
                {
                    timestamp: "2026-02-01T00:00:00.000Z",
                    healthScore: 74,
                },
            ],
            contributors: [
                {
                    ownerId: "cypher",
                    ownerName: "Cypher",
                    color: "#be123c",
                    commitCount: 46,
                },
                {
                    ownerId: "apoc",
                    ownerName: "Apoc",
                    color: "#2563eb",
                    commitCount: 31,
                },
                {
                    ownerId: "mouse",
                    ownerName: "Mouse",
                    color: "#0f766e",
                    commitCount: 18,
                },
            ],
            contributorCollaborations: [
                {
                    sourceOwnerId: "cypher",
                    targetOwnerId: "apoc",
                    coAuthorCount: 12,
                },
                {
                    sourceOwnerId: "apoc",
                    targetOwnerId: "mouse",
                    coAuthorCount: 5,
                },
                {
                    sourceOwnerId: "cypher",
                    targetOwnerId: "mouse",
                    coAuthorCount: 3,
                },
            ],
            ownership: [
                {
                    fileId: "src/adapters/queue.ts",
                    ownerId: "cypher",
                },
                {
                    fileId: "src/services/retry.ts",
                    ownerId: "apoc",
                },
                {
                    fileId: "src/worker/main.ts",
                    ownerId: "mouse",
                },
            ],
            label: "backend-core/payment-worker",
            files: [
                {
                    churn: 8,
                    complexity: 38,
                    coverage: 67,
                    id: "src/adapters/queue.ts",
                    issueCount: 4,
                    bugIntroductions: { "7d": 3, "30d": 6, "90d": 10 },
                    lastReviewAt: "2026-01-03T19:30:00Z",
                    loc: 210,
                    path: "src/adapters/queue.ts",
                },
                {
                    churn: 7,
                    complexity: 20,
                    coverage: 73,
                    id: "src/services/retry.ts",
                    issueCount: 2,
                    bugIntroductions: { "7d": 2, "30d": 5, "90d": 8 },
                    lastReviewAt: "2026-01-17T07:48:00Z",
                    loc: 112,
                    path: "src/services/retry.ts",
                },
                {
                    churn: 1,
                    complexity: 15,
                    coverage: 79,
                    id: "src/worker/main.ts",
                    issueCount: 0,
                    bugIntroductions: { "7d": 0, "30d": 1, "90d": 2 },
                    lastReviewAt: "2026-01-20T15:16:00Z",
                    loc: 76,
                    path: "src/worker/main.ts",
                },
            ],
            compareFiles: [
                {
                    complexity: 34,
                    id: "src/services/retry.ts",
                    issueCount: 3,
                    loc: 95,
                    path: "src/services/retry.ts",
                },
                {
                    complexity: 40,
                    id: "src/adapters/queue.ts",
                    issueCount: 2,
                    loc: 182,
                    path: "src/adapters/queue.ts",
                },
            ],
        },
    ] as const

/**
 * Узлы графа зависимостей между репозиториями.
 */
export const CODE_CITY_DASHBOARD_REPOSITORY_NODES: ReadonlyArray<IPackageDependencyNode> = [
    {
        id: "platform-team/api-gateway",
        layer: "api",
        name: "platform-team/api-gateway",
        size: 22,
    },
    {
        id: "frontend-team/ui-dashboard",
        layer: "ui",
        name: "frontend-team/ui-dashboard",
        size: 18,
    },
    {
        id: "backend-core/payment-worker",
        layer: "worker",
        name: "backend-core/payment-worker",
        size: 20,
    },
] as const

/**
 * Ребра графа зависимостей между репозиториями.
 */
export const CODE_CITY_DASHBOARD_REPOSITORY_RELATIONS: ReadonlyArray<IPackageDependencyRelation> = [
    {
        relationType: "runtime",
        source: "frontend-team/ui-dashboard",
        target: "platform-team/api-gateway",
    },
    {
        relationType: "runtime",
        source: "platform-team/api-gateway",
        target: "backend-core/payment-worker",
    },
    {
        relationType: "peer",
        source: "frontend-team/ui-dashboard",
        target: "backend-core/payment-worker",
    },
    {
        relationType: "build",
        source: "backend-core/payment-worker",
        target: "platform-team/api-gateway",
    },
] as const

/**
 * Шаги guided tour для CodeCity dashboard.
 */
export const CODE_CITY_GUIDED_TOUR_STEPS: ReadonlyArray<IGuidedTourStep> = [
    {
        description:
            "Start from repository and metric filters to align the city view with your current investigation context.",
        id: "controls",
        title: "Configure dashboard scope",
    },
    {
        description:
            "Use 3D preview to inspect topology, causal overlays, and local hotspots before drilling into specific files.",
        id: "city-3d",
        title: "Inspect 3D city",
    },
    {
        description:
            "Open root cause chains to follow issue propagation and jump directly into affected files and neighborhoods.",
        id: "root-cause",
        title: "Trace root causes",
    },
] as const

/**
 * Описания областей onboarding для dashboard.
 */
export const CODE_CITY_DASHBOARD_ONBOARDING_AREAS: ReadonlyArray<ICodeCityDashboardOnboardingAreaDescriptor> =
    [
        {
            description:
                "Repository, metric and overlay filters were adjusted for current analysis.",
            id: "controls",
            title: "Dashboard controls",
        },
        {
            description: "Role-aware exploration paths were executed from sidebar recommendations.",
            id: "explore",
            title: "Explore mode paths",
        },
        {
            description: "Critical hotspots were opened and focused inside the city context.",
            id: "hot-areas",
            title: "Hot area diagnostics",
        },
        {
            description: "Root-cause chains were reviewed for propagation details.",
            id: "root-cause",
            title: "Root cause analysis",
        },
        {
            description: "3D camera navigation was used to inspect selected file neighborhoods.",
            id: "city-3d",
            title: "3D city navigation",
        },
    ] as const
