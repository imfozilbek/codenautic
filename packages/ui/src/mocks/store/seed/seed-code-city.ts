import type {
    IPackageDependencyNode,
    IPackageDependencyRelation,
} from "@/components/dependency-graphs/package-dependency-graph"
import type { ICodeCityDashboardRepositoryProfile } from "@/pages/code-city-dashboard/code-city-dashboard-types"

import type { CodeCityCollection } from "../collections/code-city-collection"

/**
 * Профили репозиториев для CodeCity seed.
 */
const SEED_PROFILES: ReadonlyArray<ICodeCityDashboardRepositoryProfile> = [
    {
        id: "platform-team/api-gateway",
        label: "platform-team/api-gateway",
        description: "Backend сервис с активной CCR-маршрутизацией и API слоями.",
        files: [
            {
                id: "src/api/auth.ts",
                path: "src/api/auth.ts",
                loc: 96,
                complexity: 28,
                coverage: 82,
                churn: 4,
                issueCount: 3,
                bugIntroductions: { "7d": 1, "30d": 3, "90d": 6 },
                lastReviewAt: "2026-01-05T08:20:00Z",
            },
            {
                id: "src/api/repository.ts",
                path: "src/api/repository.ts",
                loc: 126,
                complexity: 16,
                coverage: 71,
                churn: 2,
                issueCount: 2,
                bugIntroductions: { "7d": 2, "30d": 4, "90d": 7 },
                lastReviewAt: "2026-02-01T11:30:00Z",
            },
            {
                id: "src/worker/index.ts",
                path: "src/worker/index.ts",
                loc: 138,
                complexity: 34,
                coverage: 60,
                churn: 6,
                issueCount: 0,
                bugIntroductions: { "7d": 0, "30d": 2, "90d": 5 },
                lastReviewAt: "2026-02-10T10:15:00Z",
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
        impactedFiles: [
            { fileId: "src/api/repository.ts", impactType: "changed" },
            { fileId: "src/api/router.ts", impactType: "impacted" },
            { fileId: "src/services/metrics.ts", impactType: "ripple" },
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
        contributors: [
            { ownerId: "neo", ownerName: "Neo", color: "#0f766e", commitCount: 42 },
            { ownerId: "trinity", ownerName: "Trinity", color: "#2563eb", commitCount: 26 },
            { ownerId: "morpheus", ownerName: "Morpheus", color: "#be123c", commitCount: 13 },
        ],
        contributorCollaborations: [
            { sourceOwnerId: "neo", targetOwnerId: "trinity", coAuthorCount: 9 },
            { sourceOwnerId: "neo", targetOwnerId: "morpheus", coAuthorCount: 4 },
            { sourceOwnerId: "trinity", targetOwnerId: "morpheus", coAuthorCount: 3 },
        ],
        ownership: [
            { fileId: "src/api/auth.ts", ownerId: "neo" },
            { fileId: "src/api/repository.ts", ownerId: "neo" },
            { fileId: "src/worker/index.ts", ownerId: "trinity" },
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
    },
    {
        id: "frontend-team/ui-dashboard",
        label: "frontend-team/ui-dashboard",
        description: "Frontend SPA для управления pipeline и наблюдаемостью.",
        files: [
            {
                id: "src/pages/ccr-management.page.tsx",
                path: "src/pages/ccr-management.page.tsx",
                loc: 112,
                complexity: 14,
                coverage: 88,
                churn: 5,
                issueCount: 1,
                bugIntroductions: { "7d": 1, "30d": 2, "90d": 3 },
                lastReviewAt: "2026-01-12T16:40:00Z",
            },
            {
                id: "src/components/codecity/codecity-treemap.tsx",
                path: "src/components/codecity/codecity-treemap.tsx",
                loc: 142,
                complexity: 18,
                coverage: 90,
                churn: 1,
                issueCount: 0,
                bugIntroductions: { "7d": 0, "30d": 1, "90d": 2 },
                lastReviewAt: "2026-02-07T09:00:00Z",
            },
            {
                id: "src/components/layout/sidebar.tsx",
                path: "src/components/layout/sidebar.tsx",
                loc: 64,
                complexity: 11,
                coverage: 94,
                churn: 3,
                issueCount: 2,
                bugIntroductions: { "7d": 1, "30d": 3, "90d": 4 },
                lastReviewAt: "2026-02-09T13:55:00Z",
            },
            {
                id: "src/pages/repositories-list.page.tsx",
                path: "src/pages/repositories-list.page.tsx",
                loc: 188,
                complexity: 22,
                coverage: 81,
                churn: 0,
                issueCount: 1,
                bugIntroductions: { "7d": 1, "30d": 2, "90d": 5 },
                lastReviewAt: "2026-02-10T14:10:00Z",
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
        impactedFiles: [
            { fileId: "src/pages/ccr-management.page.tsx", impactType: "changed" },
            { fileId: "src/components/layout/sidebar.tsx", impactType: "changed" },
            { fileId: "src/components/codecity/codecity-treemap.tsx", impactType: "impacted" },
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
        contributors: [
            { ownerId: "niobe", ownerName: "Niobe", color: "#0f766e", commitCount: 51 },
            { ownerId: "tank", ownerName: "Tank", color: "#2563eb", commitCount: 37 },
            { ownerId: "switch", ownerName: "Switch", color: "#ca8a04", commitCount: 23 },
        ],
        contributorCollaborations: [
            { sourceOwnerId: "niobe", targetOwnerId: "tank", coAuthorCount: 11 },
            { sourceOwnerId: "tank", targetOwnerId: "switch", coAuthorCount: 6 },
            { sourceOwnerId: "niobe", targetOwnerId: "switch", coAuthorCount: 5 },
        ],
        ownership: [
            { fileId: "src/pages/ccr-management.page.tsx", ownerId: "niobe" },
            { fileId: "src/components/codecity/codecity-treemap.tsx", ownerId: "tank" },
            { fileId: "src/components/layout/sidebar.tsx", ownerId: "switch" },
            { fileId: "src/pages/repositories-list.page.tsx", ownerId: "niobe" },
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
const SEED_DEPENDENCY_NODES: ReadonlyArray<IPackageDependencyNode> = [
    { id: "platform-team/api-gateway", name: "api-gateway", layer: "api", size: 22 },
    { id: "frontend-team/ui-dashboard", name: "ui-dashboard", layer: "ui", size: 18 },
    { id: "backend-core/payment-worker", name: "payment-worker", layer: "worker", size: 20 },
]

/**
 * Связи графа зависимостей для CodeCity seed.
 */
const SEED_DEPENDENCY_RELATIONS: ReadonlyArray<IPackageDependencyRelation> = [
    {
        source: "frontend-team/ui-dashboard",
        target: "platform-team/api-gateway",
        relationType: "runtime",
    },
    {
        source: "platform-team/api-gateway",
        target: "backend-core/payment-worker",
        relationType: "runtime",
    },
    {
        source: "frontend-team/ui-dashboard",
        target: "backend-core/payment-worker",
        relationType: "peer",
    },
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
