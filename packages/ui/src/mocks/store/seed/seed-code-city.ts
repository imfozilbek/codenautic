import type {
    ICodeCityDependencyNode,
    ICodeCityDependencyRelation,
    ICodeCityRepositoryProfile,
} from "@/lib/api/endpoints/code-city.endpoint"

import type { CodeCityCollection } from "../collections/code-city-collection"

/**
 * Профили репозиториев для CodeCity seed.
 */
const SEED_PROFILES: ReadonlyArray<ICodeCityRepositoryProfile> = [
    {
        id: "platform-team/api-gateway",
        name: "platform-team/api-gateway",
        files: [
            {
                id: "src/api/auth.ts",
                path: "src/api/auth.ts",
                loc: 96,
                complexity: 28,
                coverage: 82,
                churn: 4,
                issueCount: 3,
            },
            {
                id: "src/api/repository.ts",
                path: "src/api/repository.ts",
                loc: 126,
                complexity: 16,
                coverage: 71,
                churn: 2,
                issueCount: 2,
            },
            {
                id: "src/worker/index.ts",
                path: "src/worker/index.ts",
                loc: 138,
                complexity: 34,
                coverage: 60,
                churn: 6,
                issueCount: 0,
            },
            {
                id: "src/services/metrics.ts",
                path: "src/services/metrics.ts",
                loc: 72,
                complexity: 12,
                coverage: 88,
                churn: 1,
                issueCount: 1,
            },
            {
                id: "src/api/router.ts",
                path: "src/api/router.ts",
                loc: 54,
                complexity: 8,
                coverage: 90,
                churn: 3,
                issueCount: 0,
            },
        ],
        contributors: [
            { ownerId: "neo", ownerName: "Neo", color: "#0f766e", commitCount: 42 },
            { ownerId: "trinity", ownerName: "Trinity", color: "#2563eb", commitCount: 26 },
            { ownerId: "morpheus", ownerName: "Morpheus", color: "#be123c", commitCount: 13 },
        ],
        healthTrend: [
            { timestamp: "2025-10-20T00:00:00.000Z", healthScore: 61, annotation: "Incident" },
            { timestamp: "2025-11-15T00:00:00.000Z", healthScore: 66 },
            {
                timestamp: "2025-12-20T00:00:00.000Z",
                healthScore: 72,
                annotation: "Cache tuning",
            },
            { timestamp: "2026-01-18T00:00:00.000Z", healthScore: 78 },
            {
                timestamp: "2026-02-01T00:00:00.000Z",
                healthScore: 82,
                annotation: "Retry refactor",
            },
        ],
        temporalCouplings: [
            { sourceFileId: "src/api/auth.ts", targetFileId: "src/api/repository.ts", strength: 0.82 },
            {
                sourceFileId: "src/api/repository.ts",
                targetFileId: "src/worker/index.ts",
                strength: 0.56,
            },
        ],
    },
    {
        id: "frontend-team/ui-dashboard",
        name: "frontend-team/ui-dashboard",
        files: [
            {
                id: "src/pages/ccr-management.page.tsx",
                path: "src/pages/ccr-management.page.tsx",
                loc: 112,
                complexity: 14,
                coverage: 88,
                churn: 5,
                issueCount: 1,
            },
            {
                id: "src/components/codecity/codecity-treemap.tsx",
                path: "src/components/codecity/codecity-treemap.tsx",
                loc: 142,
                complexity: 18,
                coverage: 90,
                churn: 1,
                issueCount: 0,
            },
            {
                id: "src/components/layout/sidebar.tsx",
                path: "src/components/layout/sidebar.tsx",
                loc: 64,
                complexity: 11,
                coverage: 94,
                churn: 3,
                issueCount: 2,
            },
            {
                id: "src/pages/repositories-list.page.tsx",
                path: "src/pages/repositories-list.page.tsx",
                loc: 188,
                complexity: 22,
                coverage: 81,
                churn: 0,
                issueCount: 1,
            },
            {
                id: "src/hooks/use-theme.ts",
                path: "src/hooks/use-theme.ts",
                loc: 38,
                complexity: 5,
                coverage: 100,
                churn: 0,
                issueCount: 0,
            },
        ],
        contributors: [
            { ownerId: "niobe", ownerName: "Niobe", color: "#0f766e", commitCount: 51 },
            { ownerId: "tank", ownerName: "Tank", color: "#2563eb", commitCount: 37 },
            { ownerId: "switch", ownerName: "Switch", color: "#ca8a04", commitCount: 23 },
        ],
        healthTrend: [
            { timestamp: "2025-10-20T00:00:00.000Z", healthScore: 70 },
            {
                timestamp: "2025-11-15T00:00:00.000Z",
                healthScore: 73,
                annotation: "UI migration",
            },
            { timestamp: "2025-12-20T00:00:00.000Z", healthScore: 76 },
            { timestamp: "2026-01-18T00:00:00.000Z", healthScore: 81 },
            {
                timestamp: "2026-02-01T00:00:00.000Z",
                healthScore: 85,
                annotation: "HeroUI rollout",
            },
        ],
        temporalCouplings: [
            {
                sourceFileId: "src/pages/ccr-management.page.tsx",
                targetFileId: "src/components/codecity/codecity-treemap.tsx",
                strength: 0.74,
            },
            {
                sourceFileId: "src/components/layout/sidebar.tsx",
                targetFileId: "src/pages/repositories-list.page.tsx",
                strength: 0.48,
            },
        ],
    },
]

/**
 * Узлы графа зависимостей для CodeCity seed.
 */
const SEED_DEPENDENCY_NODES: ReadonlyArray<ICodeCityDependencyNode> = [
    { id: "platform-team/api-gateway", label: "api-gateway", type: "repository" },
    { id: "frontend-team/ui-dashboard", label: "ui-dashboard", type: "repository" },
    { id: "backend-core/payment-worker", label: "payment-worker", type: "repository" },
]

/**
 * Связи графа зависимостей для CodeCity seed.
 */
const SEED_DEPENDENCY_RELATIONS: ReadonlyArray<ICodeCityDependencyRelation> = [
    { source: "frontend-team/ui-dashboard", target: "platform-team/api-gateway", weight: 0.9 },
    { source: "platform-team/api-gateway", target: "backend-core/payment-worker", weight: 0.7 },
    { source: "frontend-team/ui-dashboard", target: "backend-core/payment-worker", weight: 0.3 },
]

/**
 * Заполняет CodeCity-коллекцию начальным набором данных.
 *
 * Загружает 2 профиля репозиториев и граф зависимостей с 3 узлами и 3 связями.
 *
 * @param codeCity - Коллекция CodeCity для заполнения.
 */
export function seedCodeCity(codeCity: CodeCityCollection): void {
    codeCity.seed({
        profiles: SEED_PROFILES,
        dependencyNodes: SEED_DEPENDENCY_NODES,
        dependencyRelations: SEED_DEPENDENCY_RELATIONS,
    })
}
