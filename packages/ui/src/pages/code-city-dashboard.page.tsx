import type { ChangeEvent, ReactElement } from "react"
import { useState } from "react"

import {
    type IPackageDependencyNode,
    type IPackageDependencyRelation,
    PackageDependencyGraph,
} from "@/components/graphs/package-dependency-graph"
import {
    CodeCityTreemap,
    type ICodeCityTreemapFileDescriptor,
    type ICodeCityTreemapFileLinkResolver,
    type ICodeCityTreemapImpactedFileDescriptor,
    type ICodeCityTreemapTemporalCouplingDescriptor,
} from "@/components/graphs/codecity-treemap"
import {
    CodeCity3DScene,
    type ICodeCity3DCausalCouplingDescriptor,
    type TCodeCityCausalCouplingType,
} from "@/components/graphs/codecity-3d-scene"
import {
    CausalOverlaySelector,
    type TCausalOverlayMode,
} from "@/components/graphs/causal-overlay-selector"
import {
    GuidedTourOverlay,
    type IGuidedTourStep,
} from "@/components/graphs/guided-tour-overlay"
import {
    ExploreModeSidebar,
    type IExploreModePathDescriptor,
} from "@/components/graphs/explore-mode-sidebar"
import {
    HotAreaHighlights,
    type IHotAreaHighlightDescriptor,
} from "@/components/graphs/hot-area-highlights"
import {
    OnboardingProgressTracker,
    type IOnboardingProgressModuleDescriptor,
} from "@/components/graphs/onboarding-progress-tracker"
import {
    RefactoringDashboard,
    type IRefactoringTargetDescriptor,
} from "@/components/graphs/refactoring-dashboard"
import { ROICalculatorWidget } from "@/components/graphs/roi-calculator-widget"
import { TourCustomizer } from "@/components/graphs/tour-customizer"
import { ProjectOverviewPanel } from "@/components/graphs/project-overview-panel"
import { ChurnComplexityScatter } from "@/components/graphs/churn-complexity-scatter"
import { HealthTrendChart, type IHealthTrendPoint } from "@/components/graphs/health-trend-chart"
import {
    RootCauseChainViewer,
    type IRootCauseChainFocusPayload,
    type IRootCauseIssueDescriptor,
} from "@/components/graphs/root-cause-chain-viewer"
import { Card, CardBody, CardHeader } from "@/components/ui"

type TCodeCityDashboardMetric = "complexity" | "coverage" | "churn"

interface ICodeCityDashboardMetricOption {
    /** Machine-friendly value. */
    readonly value: TCodeCityDashboardMetric
    /** Лейбл опции метрики. */
    readonly label: string
}

interface ICodeCityDashboardRepositoryProfile {
    /** Уникальный идентификатор репозитория. */
    readonly id: string
    /** Короткая подпись в селекторе. */
    readonly label: string
    /** Описание дашборда. */
    readonly description: string
    /** Набор файлов для treemap. */
    readonly files: ReadonlyArray<ICodeCityTreemapFileDescriptor>
    /** Список влияний CCR для визуализации по умолчанию. */
    readonly impactedFiles: ReadonlyArray<ICodeCityTreemapImpactedFileDescriptor>
    /** Базовый срез для temporal comparison. */
    readonly compareFiles: ReadonlyArray<ICodeCityTreemapFileDescriptor>
    /** Temporal coupling связи между файлами treemap. */
    readonly temporalCouplings: ReadonlyArray<ICodeCityTreemapTemporalCouplingDescriptor>
    /** История health score для линейного causal-trend графика. */
    readonly healthTrend: ReadonlyArray<IHealthTrendPoint>
}

interface ICodeCityDashboardPageProps {
    /** Идентификатор репозитория по умолчанию. */
    readonly initialRepositoryId?: string
}

const CODE_CITY_DASHBOARD_METRICS: ReadonlyArray<ICodeCityDashboardMetricOption> = [
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
 * Формирует root-cause issues для causal viewer из текущего file-среза.
 *
 * @param files Файлы активного профиля.
 * @returns Набор issue-цепочек.
 */
function buildRootCauseIssues(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IRootCauseIssueDescriptor> {
    const primaryFile = files[0]
    const secondaryFile = files[1] ?? files[0]
    if (primaryFile === undefined || secondaryFile === undefined) {
        return []
    }

    return [
        {
            chain: [
                {
                    description: `${primaryFile.path} shows rising issue density after recent CCR.`,
                    fileId: primaryFile.id,
                    id: `${primaryFile.id}-event`,
                    label: "Issue spike detected",
                    type: "event",
                },
                {
                    description: `${secondaryFile.path} is temporally coupled and amplifies blast radius.`,
                    fileId: secondaryFile.id,
                    id: `${secondaryFile.id}-module`,
                    label: "Coupled dependency node",
                    type: "module",
                },
                {
                    description: "Health trend indicates persistent degradation in this district.",
                    fileId: secondaryFile.id,
                    id: `${primaryFile.id}-metric`,
                    label: "Health degradation signal",
                    type: "metric",
                },
            ],
            id: `issue-${primaryFile.id}`,
            severity: "high",
            title: `Root cause: ${primaryFile.path}`,
        },
        {
            chain: [
                {
                    description: `${secondaryFile.path} has increased churn and contributes to instability.`,
                    fileId: secondaryFile.id,
                    id: `${secondaryFile.id}-event`,
                    label: "Churn volatility",
                    type: "event",
                },
                {
                    description: `Coverage gaps near ${secondaryFile.path} increase regression likelihood.`,
                    fileId: primaryFile.id,
                    id: `${secondaryFile.id}-metric`,
                    label: "Coverage regression pressure",
                    type: "metric",
                },
            ],
            id: `issue-${secondaryFile.id}`,
            severity: "medium",
            title: `Root cause: ${secondaryFile.path}`,
        },
    ]
}

function resolveCausalCouplingType(strength: number): TCodeCityCausalCouplingType {
    if (strength >= 0.75) {
        return "dependency"
    }
    if (strength >= 0.5) {
        return "temporal"
    }
    return "ownership"
}

function buildCausalCouplings(
    temporalCouplings: ReadonlyArray<ICodeCityTreemapTemporalCouplingDescriptor>,
): ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> {
    return temporalCouplings.map((coupling): ICodeCity3DCausalCouplingDescriptor => {
        return {
            couplingType: resolveCausalCouplingType(coupling.strength),
            sourceFileId: coupling.sourceFileId,
            strength: coupling.strength,
            targetFileId: coupling.targetFileId,
        }
    })
}

const CODE_CITY_DASHBOARD_REPOSITORIES: ReadonlyArray<ICodeCityDashboardRepositoryProfile> = [
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

const CODE_CITY_DASHBOARD_REPOSITORY_NODES: ReadonlyArray<IPackageDependencyNode> = [
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

const CODE_CITY_DASHBOARD_REPOSITORY_RELATIONS: ReadonlyArray<IPackageDependencyRelation> = [
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

const DEFAULT_DASHBOARD_REPOSITORY = getDefaultDashboardRepository()

function getDefaultDashboardRepository(): ICodeCityDashboardRepositoryProfile {
    const defaultRepository = CODE_CITY_DASHBOARD_REPOSITORIES[0]
    if (defaultRepository === undefined) {
        throw new Error("CodeCity dashboard requires at least one repository profile")
    }

    return defaultRepository
}

function resolveDashboardProfile(
    repositoryId: string,
): ICodeCityDashboardRepositoryProfile {
    const selected = CODE_CITY_DASHBOARD_REPOSITORIES.find(
        (entry): boolean => entry.id === repositoryId,
    )
    return selected ?? DEFAULT_DASHBOARD_REPOSITORY
}

function isCodeCityMetric(value: string): value is TCodeCityDashboardMetric {
    return value === "complexity" || value === "coverage" || value === "churn"
}

function resolveRepositoryOptions(
    repositories: ReadonlyArray<ICodeCityDashboardRepositoryProfile>,
): ReadonlyArray<string> {
    return repositories.map((entry): string => entry.id)
}

function createRepositoryFilesLink(repositoryId: string):
    ((file: ICodeCityTreemapFileLinkResolver) => string) {
    const encodedRepo = encodeURIComponent(repositoryId)

    return (file): string => {
        const encodedFile = encodeURIComponent(file.path)
        return `/repositories/${encodedRepo}?file=${encodedFile}`
    }
}

/**
 * Страница CodeCity для кросс-репозитория с выбором метрики и репозитория.
 */
const CODE_CITY_GUIDED_TOUR_STEPS: ReadonlyArray<IGuidedTourStep> = [
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

interface IExploreNavigationFocusState {
    readonly title: string
    readonly chainFileIds: ReadonlyArray<string>
    readonly activeFileId?: string
}

type TDashboardOnboardingAreaId =
    | "controls"
    | "explore"
    | "hot-areas"
    | "root-cause"
    | "city-3d"

interface ICodeCityDashboardOnboardingAreaDescriptor {
    readonly id: TDashboardOnboardingAreaId
    readonly title: string
    readonly description: string
}

const CODE_CITY_DASHBOARD_ONBOARDING_AREAS:
    ReadonlyArray<ICodeCityDashboardOnboardingAreaDescriptor> = [
        {
            description: "Repository, metric and overlay filters were adjusted for current analysis.",
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

function buildOnboardingProgressModules(
    exploredAreaIds: ReadonlyArray<string>,
): ReadonlyArray<IOnboardingProgressModuleDescriptor> {
    return CODE_CITY_DASHBOARD_ONBOARDING_AREAS.map(
        (area): IOnboardingProgressModuleDescriptor => {
            return {
                description: area.description,
                id: area.id,
                isComplete: exploredAreaIds.includes(area.id),
                title: area.title,
            }
        },
    )
}

function resolveOnboardingAreaFromTourStep(
    tourStepId: string,
): TDashboardOnboardingAreaId | undefined {
    if (tourStepId === "controls") {
        return "controls"
    }
    if (tourStepId === "city-3d") {
        return "city-3d"
    }
    if (tourStepId === "root-cause") {
        return "root-cause"
    }
    return undefined
}

/**
 * Формирует role-aware набор exploration paths на базе scan-файлов.
 *
 * @param files Файлы из dashboard profile.
 * @returns Рекомендованные пути исследования для sidebar.
 */
function buildExploreModePaths(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IExploreModePathDescriptor> {
    const topBackendFiles = files
        .filter((file): boolean => /api|service|worker|backend/i.test(file.path))
        .slice(0, 3)
        .map((file): string => file.id)
    const topFrontendFiles = files
        .filter((file): boolean => /ui|component|page|frontend/i.test(file.path))
        .slice(0, 3)
        .map((file): string => file.id)
    const topArchitectureFiles = files
        .filter((file): boolean => /domain|core|graph|architecture/i.test(file.path))
        .slice(0, 3)
        .map((file): string => file.id)
    const defaultChain = files.slice(0, 3).map((file): string => file.id)

    return [
        {
            description: "Follow API/service hotspots and worker bottlenecks.",
            fileChainIds: topBackendFiles.length > 0 ? topBackendFiles : defaultChain,
            id: "explore-backend-hotspots",
            role: "backend",
            title: "Backend hotspots path",
        },
        {
            description: "Inspect UI pages/components and their dependency neighborhoods.",
            fileChainIds: topFrontendFiles.length > 0 ? topFrontendFiles : defaultChain,
            id: "explore-frontend-flows",
            role: "frontend",
            title: "Frontend interaction path",
        },
        {
            description: "Review architecture-critical modules and shared graph zones.",
            fileChainIds: topArchitectureFiles.length > 0 ? topArchitectureFiles : defaultChain,
            id: "explore-architecture-core",
            role: "architect",
            title: "Architecture core path",
        },
    ]
}

/**
 * Формирует hot area highlights для критичных зон в текущем профиле.
 *
 * @param files Файлы профиля.
 * @returns Набор зон для visual highlights.
 */
function buildHotAreaHighlights(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IHotAreaHighlightDescriptor> {
    const rankedFiles = [...files]
        .sort((leftFile, rightFile): number => {
            const leftRiskScore =
                (leftFile.complexity ?? 0) + ((leftFile.bugIntroductions?.["30d"] ?? 0) * 2)
            const rightRiskScore =
                (rightFile.complexity ?? 0) + ((rightFile.bugIntroductions?.["30d"] ?? 0) * 2)
            return rightRiskScore - leftRiskScore
        })
        .slice(0, 4)

    return rankedFiles.map((file, index): IHotAreaHighlightDescriptor => {
        const severity: IHotAreaHighlightDescriptor["severity"] =
            index === 0 ? "critical" : index < 3 ? "high" : "medium"
        const bugCount = file.bugIntroductions?.["30d"] ?? 0

        return {
            description: `Complexity ${String(file.complexity ?? 0)} · Bugs (30d) ${String(bugCount)}`,
            fileId: file.id,
            label: file.path,
            severity,
        }
    })
}

/**
 * Формирует список refactoring targets с приоритетами ROI/risk/effort.
 *
 * @param files Файлы текущего профиля.
 * @returns Список приоритетных таргетов для dashboard.
 */
function buildRefactoringTargets(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IRefactoringTargetDescriptor> {
    const targets = files.map((file): IRefactoringTargetDescriptor => {
        const bugCount = file.bugIntroductions?.["30d"] ?? 0
        const complexity = file.complexity ?? 0
        const churn = file.churn ?? 0
        const loc = file.loc ?? 0
        const moduleName = file.path.split("/")[1] ?? "core"

        return {
            description:
                `Complexity ${String(complexity)}, churn ${String(churn)}, bugs(30d) ${String(bugCount)}`,
            effortScore: Math.max(1, Math.round((loc / 40) + (complexity / 8))),
            fileId: file.id,
            id: `refactor-${file.id}`,
            module: moduleName,
            riskScore: Math.max(1, Math.min(99, Math.round((bugCount * 12) + (churn * 6)))),
            roiScore: Math.max(1, Math.round((complexity * 1.2) + (bugCount * 10))),
            title: file.path,
        }
    })

    return [...targets]
        .sort((leftTarget, rightTarget): number => rightTarget.roiScore - leftTarget.roiScore)
        .slice(0, 6)
}

export function CodeCityDashboardPage(
    props: ICodeCityDashboardPageProps = {},
): ReactElement {
    const repositoryOptions = resolveRepositoryOptions(CODE_CITY_DASHBOARD_REPOSITORIES)
    const initialRepositoryId =
        props.initialRepositoryId === undefined
            ? DEFAULT_DASHBOARD_REPOSITORY.id
            : repositoryOptions.includes(props.initialRepositoryId)
              ? props.initialRepositoryId
              : DEFAULT_DASHBOARD_REPOSITORY.id

    const [repositoryId, setRepositoryId] = useState<string>(initialRepositoryId)
    const [metric, setMetric] = useState<TCodeCityDashboardMetric>("complexity")
    const [overlayMode, setOverlayMode] = useState<TCausalOverlayMode>("impact")
    const [exploreNavigationFocus, setExploreNavigationFocus] = useState<IExploreNavigationFocusState>(
        {
            chainFileIds: [],
            title: "",
        },
    )
    const [highlightedFileId, setHighlightedFileId] = useState<string | undefined>()
    const [exploredAreaIds, setExploredAreaIds] = useState<ReadonlyArray<string>>(["controls"])
    const [guidedTourStepIndex, setGuidedTourStepIndex] = useState<number>(0)
    const [isGuidedTourActive, setIsGuidedTourActive] = useState<boolean>(true)
    const [customTourSteps, setCustomTourSteps] = useState<ReadonlyArray<IGuidedTourStep>>([])
    const [rootCauseChainFocus, setRootCauseChainFocus] = useState<IRootCauseChainFocusPayload>({
        chainFileIds: [],
        issueId: "",
        issueTitle: "",
    })
    const guidedTourSteps =
        customTourSteps.length > 0 ? customTourSteps : CODE_CITY_GUIDED_TOUR_STEPS
    const activeGuidedTourStep =
        guidedTourSteps[Math.max(0, Math.min(guidedTourStepIndex, guidedTourSteps.length - 1))] ??
        guidedTourSteps[0]

    const currentProfile = resolveDashboardProfile(repositoryId)
    const rootCauseIssues = buildRootCauseIssues(currentProfile.files)
    const causalCouplings = buildCausalCouplings(currentProfile.temporalCouplings)
    const exploreModePaths = buildExploreModePaths(currentProfile.files)
    const hotAreaHighlights = buildHotAreaHighlights(currentProfile.files)
    const refactoringTargets = buildRefactoringTargets(currentProfile.files)
    const onboardingProgressModules = buildOnboardingProgressModules(exploredAreaIds)
    const fileLink = createRepositoryFilesLink(currentProfile.id)
    const overlayImpactedFiles =
        overlayMode === "impact" ? currentProfile.impactedFiles : []
    const overlayTemporalCouplings =
        overlayMode === "temporal-coupling" ? currentProfile.temporalCouplings : []
    const overlayRootCauseIssues = overlayMode === "root-cause" ? rootCauseIssues : []
    const overlayCausalCouplings =
        overlayMode === "temporal-coupling" ? causalCouplings : []

    const markAreaExplored = (areaId: TDashboardOnboardingAreaId): void => {
        setExploredAreaIds((currentAreaIds): ReadonlyArray<string> => {
            if (currentAreaIds.includes(areaId)) {
                return currentAreaIds
            }
            return [...currentAreaIds, areaId]
        })
    }

    const handleRepositoryChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextRepositoryId = event.currentTarget.value
        if (repositoryOptions.includes(nextRepositoryId) === false) {
            return
        }

        setRepositoryId(nextRepositoryId)
        setHighlightedFileId(undefined)
        setRootCauseChainFocus({
            chainFileIds: [],
            issueId: "",
            issueTitle: "",
        })
        setExploreNavigationFocus({
            chainFileIds: [],
            title: "",
        })
        setExploredAreaIds(["controls"])
    }

    const handleMetricChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextMetric = event.currentTarget.value
        if (isCodeCityMetric(nextMetric) === false) {
            return
        }

        setMetric(nextMetric)
        markAreaExplored("controls")
    }

    const handleOverlayModeChange = (nextMode: TCausalOverlayMode): void => {
        setOverlayMode(nextMode)
        markAreaExplored("controls")
        if (nextMode === "root-cause") {
            markAreaExplored("root-cause")
        }
    }

    const handleRootCauseChainFocusChange = (payload: IRootCauseChainFocusPayload): void => {
        setRootCauseChainFocus(payload)
        markAreaExplored("root-cause")
        markAreaExplored("city-3d")
    }

    const handleTourStepsChange = (nextSteps: ReadonlyArray<IGuidedTourStep>): void => {
        if (nextSteps.length === 0) {
            return
        }
        setCustomTourSteps(nextSteps)
        setGuidedTourStepIndex((currentStepIndex): number => {
            return Math.min(currentStepIndex, nextSteps.length - 1)
        })
    }

    const resolveTourCardClassName = (stepId: string): string | undefined => {
        if (isGuidedTourActive === false || activeGuidedTourStep?.id !== stepId) {
            return undefined
        }

        return "ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-slate-100"
    }

    return (
        <section className="relative space-y-4">
            <GuidedTourOverlay
                currentStepIndex={guidedTourStepIndex}
                isActive={isGuidedTourActive}
                onNext={(): void => {
                    const activeTourStepId = activeGuidedTourStep?.id
                    if (activeTourStepId !== undefined) {
                        const mappedAreaId = resolveOnboardingAreaFromTourStep(activeTourStepId)
                        if (mappedAreaId !== undefined) {
                            markAreaExplored(mappedAreaId)
                        }
                    }
                    setGuidedTourStepIndex((currentStepIndex): number => {
                        const lastStepIndex = guidedTourSteps.length - 1
                        if (currentStepIndex >= lastStepIndex) {
                            setIsGuidedTourActive(false)
                            return currentStepIndex
                        }
                        return currentStepIndex + 1
                    })
                }}
                onPrevious={(): void => {
                    setGuidedTourStepIndex((currentStepIndex): number => {
                        return Math.max(0, currentStepIndex - 1)
                    })
                }}
                onSkip={(): void => {
                    setIsGuidedTourActive(false)
                }}
                steps={guidedTourSteps}
            />
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Tour customizer</p>
                </CardHeader>
                <CardBody>
                    <TourCustomizer
                        isAdmin={true}
                        onStepsChange={handleTourStepsChange}
                        steps={guidedTourSteps}
                    />
                </CardBody>
            </Card>
            <Card className={resolveTourCardClassName("controls")}>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">CodeCity dashboard</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <p className="text-sm text-slate-600">{currentProfile.description}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1" htmlFor="dashboard-repository">
                            <span className="text-sm font-semibold text-slate-900">
                                Repository filter
                            </span>
                            <select
                                aria-label="Repository"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                id="dashboard-repository"
                                value={repositoryId}
                                onChange={handleRepositoryChange}
                            >
                                {repositoryOptions.map((entry): ReactElement => (
                                    <option key={entry} value={entry}>
                                        {entry}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1" htmlFor="dashboard-metric">
                            <span className="text-sm font-semibold text-slate-900">
                                Metric selector
                            </span>
                            <select
                                aria-label="Metric"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                id="dashboard-metric"
                                value={metric}
                                onChange={handleMetricChange}
                            >
                                {CODE_CITY_DASHBOARD_METRICS.map((entry): ReactElement => (
                                    <option key={entry.value} value={entry.value}>
                                        {entry.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <CausalOverlaySelector value={overlayMode} onChange={handleOverlayModeChange} />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Project overview panel</p>
                </CardHeader>
                <CardBody>
                    <ProjectOverviewPanel
                        files={currentProfile.files}
                        repositoryId={currentProfile.id}
                        repositoryLabel={currentProfile.label}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Explore mode sidebar</p>
                </CardHeader>
                <CardBody>
                    <ExploreModeSidebar
                        onNavigatePath={(path): void => {
                            markAreaExplored("explore")
                            markAreaExplored("city-3d")
                            setExploreNavigationFocus({
                                activeFileId: path.fileChainIds.at(0),
                                chainFileIds: path.fileChainIds,
                                title: path.title,
                            })
                        }}
                        paths={exploreModePaths}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Hot area highlights</p>
                </CardHeader>
                <CardBody>
                    <HotAreaHighlights
                        highlights={hotAreaHighlights}
                        onFocusHotArea={(highlight): void => {
                            markAreaExplored("hot-areas")
                            markAreaExplored("city-3d")
                            setHighlightedFileId(highlight.fileId)
                            setExploreNavigationFocus({
                                activeFileId: highlight.fileId,
                                chainFileIds: [highlight.fileId],
                                title: `Hot area: ${highlight.label}`,
                            })
                        }}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">
                        Onboarding progress tracker
                    </p>
                </CardHeader>
                <CardBody>
                    <OnboardingProgressTracker modules={onboardingProgressModules} />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Refactoring dashboard</p>
                </CardHeader>
                <CardBody>
                    <RefactoringDashboard
                        onSelectTarget={(target): void => {
                            setHighlightedFileId(target.fileId)
                            setExploreNavigationFocus({
                                activeFileId: target.fileId,
                                chainFileIds: [target.fileId],
                                title: `Refactor target: ${target.title}`,
                            })
                            markAreaExplored("city-3d")
                        }}
                        targets={refactoringTargets}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">ROI calculator widget</p>
                </CardHeader>
                <CardBody>
                    <ROICalculatorWidget
                        onApplyScenario={(fileIds): void => {
                            const primaryFileId = fileIds[0]
                            if (primaryFileId !== undefined) {
                                setHighlightedFileId(primaryFileId)
                            }
                            setExploreNavigationFocus({
                                activeFileId: primaryFileId,
                                chainFileIds: fileIds,
                                title: "ROI scenario",
                            })
                            markAreaExplored("city-3d")
                        }}
                        targets={refactoringTargets}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">
                        Cross-repository dependencies
                    </p>
                </CardHeader>
                <CardBody>
                    <PackageDependencyGraph
                        height="360px"
                        nodes={CODE_CITY_DASHBOARD_REPOSITORY_NODES}
                        relations={CODE_CITY_DASHBOARD_REPOSITORY_RELATIONS}
                        showControls={true}
                        showMiniMap={true}
                        title="Cross-repository package dependencies"
                    />
                </CardBody>
            </Card>

            <Card className={resolveTourCardClassName("city-3d")}>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">CodeCity 3D preview</p>
                </CardHeader>
                <CardBody>
                    <CodeCity3DScene
                        causalCouplings={overlayCausalCouplings}
                        files={currentProfile.files}
                        navigationActiveFileId={
                            overlayMode === "root-cause"
                                ? rootCauseChainFocus.activeFileId
                                : exploreNavigationFocus.activeFileId
                        }
                        navigationChainFileIds={
                            overlayMode === "root-cause"
                                ? rootCauseChainFocus.chainFileIds
                                : exploreNavigationFocus.chainFileIds
                        }
                        navigationLabel={
                            overlayMode === "root-cause"
                                ? rootCauseChainFocus.issueTitle
                                : exploreNavigationFocus.title
                        }
                        impactedFiles={overlayImpactedFiles}
                        title={`${currentProfile.label} 3D scene`}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">
                        Churn vs complexity side panel
                    </p>
                </CardHeader>
                <CardBody>
                    <ChurnComplexityScatter
                        files={currentProfile.files}
                        onFileSelect={setHighlightedFileId}
                        selectedFileId={highlightedFileId}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Health trend timeline</p>
                </CardHeader>
                <CardBody>
                    <HealthTrendChart points={currentProfile.healthTrend} />
                </CardBody>
            </Card>

            <Card className={resolveTourCardClassName("root-cause")}>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Root cause chain viewer</p>
                </CardHeader>
                <CardBody>
                    <RootCauseChainViewer
                        issues={overlayRootCauseIssues}
                        onChainFocusChange={handleRootCauseChainFocusChange}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardBody>
                    <CodeCityTreemap
                        key={`${currentProfile.id}-${metric}`}
                        comparisonLabel={`${currentProfile.id}-baseline`}
                        compareFiles={currentProfile.compareFiles}
                        defaultMetric={metric}
                        fileLink={fileLink}
                        files={currentProfile.files}
                        highlightedFileId={highlightedFileId}
                        impactedFiles={overlayImpactedFiles}
                        temporalCouplings={overlayTemporalCouplings}
                        title={`${currentProfile.label} treemap`}
                    />
                </CardBody>
            </Card>
        </section>
    )
}
