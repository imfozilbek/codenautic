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
    ChangeRiskGauge,
    type IChangeRiskGaugePoint,
} from "@/components/graphs/change-risk-gauge"
import {
    CityBusFactorOverlay,
    type ICityBusFactorOverlayEntry,
} from "@/components/graphs/city-bus-factor-overlay"
import {
    CityImpactOverlay,
    type ICityImpactOverlayEntry,
} from "@/components/graphs/city-impact-overlay"
import {
    CityOwnershipOverlay,
    type ICityOwnershipOverlayOwnerEntry,
} from "@/components/graphs/city-ownership-overlay"
import {
    CityRefactoringOverlay,
    type ICityRefactoringOverlayEntry,
} from "@/components/graphs/city-refactoring-overlay"
import {
    GuidedTourOverlay,
    type IGuidedTourStep,
} from "@/components/graphs/guided-tour-overlay"
import {
    ImpactGraphView,
    type IImpactGraphEdge,
    type IImpactGraphNode,
} from "@/components/graphs/impact-graph-view"
import {
    ImpactAnalysisPanel,
    type IImpactAnalysisSeed,
} from "@/components/graphs/impact-analysis-panel"
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
import { RefactoringExportDialog } from "@/components/graphs/refactoring-export-dialog"
import {
    RefactoringTimeline,
    type IRefactoringTimelineTask,
} from "@/components/graphs/refactoring-timeline"
import { ROICalculatorWidget } from "@/components/graphs/roi-calculator-widget"
import { SimulationPanel } from "@/components/graphs/simulation-panel"
import { TourCustomizer } from "@/components/graphs/tour-customizer"
import { ProjectOverviewPanel } from "@/components/graphs/project-overview-panel"
import { ChurnComplexityScatter } from "@/components/graphs/churn-complexity-scatter"
import {
    ContributorCollaborationGraph,
    type IContributorCollaborationEdge,
    type IContributorCollaborationNode,
} from "@/components/graphs/contributor-collaboration-graph"
import { HealthTrendChart, type IHealthTrendPoint } from "@/components/graphs/health-trend-chart"
import {
    KnowledgeSiloPanel,
    type IKnowledgeSiloPanelEntry,
} from "@/components/graphs/knowledge-silo-panel"
import {
    RootCauseChainViewer,
    type IRootCauseChainFocusPayload,
    type IRootCauseIssueDescriptor,
} from "@/components/graphs/root-cause-chain-viewer"
import { WhatIfPanel, type IWhatIfOption } from "@/components/graphs/what-if-panel"
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
    /** Владельцы с цветами и avatar для ownership overlay. */
    readonly contributors: ReadonlyArray<ICodeCityDashboardContributorDescriptor>
    /** Маппинг файл -> owner для ownership overlay. */
    readonly ownership: ReadonlyArray<ICodeCityDashboardOwnershipDescriptor>
    /** Связи co-authoring между контрибьюторами. */
    readonly contributorCollaborations:
        ReadonlyArray<ICodeCityDashboardContributorCollaborationDescriptor>
}

interface ICodeCityDashboardContributorDescriptor {
    /** Идентификатор владельца. */
    readonly ownerId: string
    /** Отображаемое имя владельца. */
    readonly ownerName: string
    /** Цвет владельца в city overlay. */
    readonly color: string
    /** Ссылка на avatar. */
    readonly ownerAvatarUrl?: string
    /** Количество коммитов для contributor graph. */
    readonly commitCount: number
}

interface ICodeCityDashboardOwnershipDescriptor {
    /** Идентификатор файла. */
    readonly fileId: string
    /** Владелец файла. */
    readonly ownerId: string
}

interface ICodeCityDashboardContributorCollaborationDescriptor {
    /** Source owner id. */
    readonly sourceOwnerId: string
    /** Target owner id. */
    readonly targetOwnerId: string
    /** Частота совместных коммитов. */
    readonly coAuthorCount: number
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
        contributors: [
            {
                ownerId: "alice-rivera",
                ownerName: "Alice Rivera",
                color: "#0f766e",
                commitCount: 42,
            },
            {
                ownerId: "max-h",
                ownerName: "Max H.",
                color: "#2563eb",
                commitCount: 26,
            },
            {
                ownerId: "luna-kim",
                ownerName: "Luna Kim",
                color: "#be123c",
                commitCount: 13,
            },
        ],
        contributorCollaborations: [
            {
                sourceOwnerId: "alice-rivera",
                targetOwnerId: "max-h",
                coAuthorCount: 9,
            },
            {
                sourceOwnerId: "alice-rivera",
                targetOwnerId: "luna-kim",
                coAuthorCount: 4,
            },
            {
                sourceOwnerId: "max-h",
                targetOwnerId: "luna-kim",
                coAuthorCount: 3,
            },
        ],
        ownership: [
            {
                fileId: "src/api/auth.ts",
                ownerId: "alice-rivera",
            },
            {
                fileId: "src/api/repository.ts",
                ownerId: "alice-rivera",
            },
            {
                fileId: "src/worker/index.ts",
                ownerId: "max-h",
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
                ownerId: "nora-s",
                ownerName: "Nora S.",
                color: "#0f766e",
                commitCount: 51,
            },
            {
                ownerId: "samir-i",
                ownerName: "Samir I.",
                color: "#2563eb",
                commitCount: 37,
            },
            {
                ownerId: "dina-k",
                ownerName: "Dina K.",
                color: "#ca8a04",
                commitCount: 23,
            },
        ],
        contributorCollaborations: [
            {
                sourceOwnerId: "nora-s",
                targetOwnerId: "samir-i",
                coAuthorCount: 11,
            },
            {
                sourceOwnerId: "samir-i",
                targetOwnerId: "dina-k",
                coAuthorCount: 6,
            },
            {
                sourceOwnerId: "nora-s",
                targetOwnerId: "dina-k",
                coAuthorCount: 5,
            },
        ],
        ownership: [
            {
                fileId: "src/pages/ccr-management.page.tsx",
                ownerId: "nora-s",
            },
            {
                fileId: "src/components/graphs/codecity-treemap.tsx",
                ownerId: "samir-i",
            },
            {
                fileId: "src/components/layout/sidebar.tsx",
                ownerId: "dina-k",
            },
            {
                fileId: "src/pages/repositories-list.page.tsx",
                ownerId: "nora-s",
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
                ownerId: "ryan-p",
                ownerName: "Ryan P.",
                color: "#be123c",
                commitCount: 46,
            },
            {
                ownerId: "mira-v",
                ownerName: "Mira V.",
                color: "#2563eb",
                commitCount: 31,
            },
            {
                ownerId: "igor-t",
                ownerName: "Igor T.",
                color: "#0f766e",
                commitCount: 18,
            },
        ],
        contributorCollaborations: [
            {
                sourceOwnerId: "ryan-p",
                targetOwnerId: "mira-v",
                coAuthorCount: 12,
            },
            {
                sourceOwnerId: "mira-v",
                targetOwnerId: "igor-t",
                coAuthorCount: 5,
            },
            {
                sourceOwnerId: "ryan-p",
                targetOwnerId: "igor-t",
                coAuthorCount: 3,
            },
        ],
        ownership: [
            {
                fileId: "src/adapters/queue.ts",
                ownerId: "ryan-p",
            },
            {
                fileId: "src/services/retry.ts",
                ownerId: "mira-v",
            },
            {
                fileId: "src/worker/main.ts",
                ownerId: "igor-t",
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

/**
 * Формирует overlay-слой приоритетов рефакторинга для CodeCity.
 *
 * @param targets Приоритизированные refactoring targets.
 * @returns Дескрипторы overlay-элементов.
 */
function buildCityRefactoringOverlayEntries(
    targets: ReadonlyArray<IRefactoringTargetDescriptor>,
): ReadonlyArray<ICityRefactoringOverlayEntry> {
    return targets.slice(0, 5).map((target, index): ICityRefactoringOverlayEntry => {
        const priority: ICityRefactoringOverlayEntry["priority"] =
            index === 0 ? "critical" : index < 3 ? "high" : "medium"

        return {
            details: `ROI ${String(target.roiScore)} · Risk ${String(target.riskScore)} · Effort ${String(target.effortScore)}`,
            fileId: target.fileId,
            label: target.title,
            priority,
        }
    })
}

/**
 * Формирует timeline задачи для плана рефакторинга.
 *
 * @param targets Приоритизированные refactoring targets.
 * @returns Список задач с зависимостями.
 */
function buildRefactoringTimelineTasks(
    targets: ReadonlyArray<IRefactoringTargetDescriptor>,
): ReadonlyArray<IRefactoringTimelineTask> {
    return targets.slice(0, 5).map((target, index, sourceTargets): IRefactoringTimelineTask => {
        const previousTarget = sourceTargets[index - 1]
        const previousPreviousTarget = sourceTargets[index - 2]
        const dependencies: Array<string> = []

        if (previousTarget !== undefined) {
            dependencies.push(previousTarget.title)
        }
        if (index >= 3 && previousPreviousTarget !== undefined) {
            dependencies.push(previousPreviousTarget.title)
        }

        return {
            dependencies,
            durationWeeks: Math.max(1, Math.min(6, Math.round(target.effortScore / 2))),
            fileId: target.fileId,
            id: `timeline-${target.id}`,
            startWeek: (index * 2) + 1,
            title: target.title,
        }
    })
}

/**
 * Формирует seeds для impact analysis панели.
 *
 * @param files Файлы текущего профиля.
 * @returns Набор seed-элементов для blast radius.
 */
function buildImpactAnalysisSeeds(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IImpactAnalysisSeed> {
    return files.slice(0, 6).map((file, index, sourceFiles): IImpactAnalysisSeed => {
        const nextFile = sourceFiles[index + 1] ?? sourceFiles[0]
        const secondNextFile = sourceFiles[index + 2] ?? sourceFiles[1] ?? nextFile
        const bugCount = file.bugIntroductions?.["30d"] ?? 0
        const complexity = file.complexity ?? 0

        return {
            affectedConsumers: [
                `${file.path.split("/")[1] ?? "core"}-consumer`,
                `${file.path.split("/")[2] ?? "runtime"}-worker`,
            ],
            affectedFiles: [
                nextFile?.path ?? file.path,
                secondNextFile?.path ?? file.path,
            ].filter((path): boolean => path.length > 0),
            affectedTests: [
                `tests/${file.path.split("/").slice(-1)[0] ?? "module"}.test.ts`,
                `tests/${nextFile?.path.split("/").slice(-1)[0] ?? "module"}.test.ts`,
            ],
            fileId: file.id,
            id: `impact-${file.id}`,
            label: file.path,
            riskScore: Math.max(1, Math.min(99, Math.round((complexity * 1.5) + (bugCount * 9)))),
        }
    })
}

/**
 * Формирует ripple overlay entries для CodeCity impact view.
 *
 * @param seeds Набор impact seeds.
 * @returns Overlay дескрипторы с интенсивностью.
 */
function buildCityImpactOverlayEntries(
    seeds: ReadonlyArray<IImpactAnalysisSeed>,
): ReadonlyArray<ICityImpactOverlayEntry> {
    return seeds.slice(0, 5).map((seed): ICityImpactOverlayEntry => {
        return {
            details:
                `Affected files ${String(seed.affectedFiles.length)} · Tests ${String(seed.affectedTests.length)} · Consumers ${String(seed.affectedConsumers.length)}`,
            fileId: seed.fileId,
            intensity: Math.max(1, Math.min(99, seed.riskScore)),
            label: seed.label,
        }
    })
}

/**
 * Формирует ownership legend entries для overlay по данным профиля.
 *
 * @param files Файлы текущего профиля.
 * @param contributors Справочник владельцев.
 * @param ownership Маппинг файлов на владельцев.
 * @returns Готовые ownership entries для UI.
 */
function buildOwnershipOverlayEntries(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    contributors: ReadonlyArray<ICodeCityDashboardContributorDescriptor>,
    ownership: ReadonlyArray<ICodeCityDashboardOwnershipDescriptor>,
): ReadonlyArray<ICityOwnershipOverlayOwnerEntry> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )
    const contributorById = new Map<string, ICodeCityDashboardContributorDescriptor>(
        contributors.map(
            (contributor): readonly [string, ICodeCityDashboardContributorDescriptor] => [
                contributor.ownerId,
                contributor,
            ],
        ),
    )
    const fileIdsByOwner = new Map<string, string[]>()

    for (const relation of ownership) {
        if (fileById.has(relation.fileId) === false) {
            continue
        }
        const ownerFiles = fileIdsByOwner.get(relation.ownerId)
        if (ownerFiles === undefined) {
            fileIdsByOwner.set(relation.ownerId, [relation.fileId])
            continue
        }
        ownerFiles.push(relation.fileId)
    }

    return Array.from(fileIdsByOwner.entries())
        .map(([ownerId, fileIds]): ICityOwnershipOverlayOwnerEntry | undefined => {
            const primaryFileId = fileIds[0]
            if (primaryFileId === undefined) {
                return undefined
            }
            const contributor = contributorById.get(ownerId)

            return {
                color: contributor?.color ?? "#334155",
                fileIds,
                ownerAvatarUrl: contributor?.ownerAvatarUrl,
                ownerId,
                ownerName: contributor?.ownerName ?? ownerId,
                primaryFileId,
            }
        })
        .filter((entry): entry is ICityOwnershipOverlayOwnerEntry => entry !== undefined)
        .sort((leftOwner, rightOwner): number => rightOwner.fileIds.length - leftOwner.fileIds.length)
}

/**
 * Формирует мапу цветов для раскраски зданий по owner.
 *
 * @param ownershipEntries Элементы ownership overlay.
 * @param isEnabled Флаг активности ownership режима.
 * @returns Record fileId -> color для treemap или undefined.
 */
function buildOwnershipFileColorById(
    ownershipEntries: ReadonlyArray<ICityOwnershipOverlayOwnerEntry>,
    isEnabled: boolean,
): Readonly<Record<string, string>> | undefined {
    if (isEnabled === false) {
        return undefined
    }

    const colorByFileId: Record<string, string> = {}
    for (const owner of ownershipEntries) {
        for (const fileId of owner.fileIds) {
            colorByFileId[fileId] = owner.color
        }
    }

    return Object.keys(colorByFileId).length === 0 ? undefined : colorByFileId
}

function resolveBusFactorDistrictColor(
    busFactor: number,
): string {
    if (busFactor <= 1) {
        return "#dc2626"
    }
    if (busFactor === 2) {
        return "#d97706"
    }
    return "#15803d"
}

function resolveDistrictName(
    filePath: string,
): string {
    const normalizedPath = filePath.trim().replaceAll("\\", "/")
    const separatorIndex = normalizedPath.lastIndexOf("/")
    if (separatorIndex <= 0) {
        return "root"
    }
    return normalizedPath.slice(0, separatorIndex)
}

/**
 * Формирует district-level bus factor модель для CodeCity overlay.
 *
 * @param files Файлы текущего профиля.
 * @param ownership Маппинг владения файлами.
 * @returns Список district entries с риском bus factor.
 */
function buildBusFactorOverlayEntries(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    ownership: ReadonlyArray<ICodeCityDashboardOwnershipDescriptor>,
): ReadonlyArray<ICityBusFactorOverlayEntry> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )
    const fileIdsByDistrict = new Map<string, string[]>()
    const ownerIdsByDistrict = new Map<string, Set<string>>()

    for (const relation of ownership) {
        const file = fileById.get(relation.fileId)
        if (file === undefined) {
            continue
        }

        const districtId = resolveDistrictName(file.path)
        const districtFileIds = fileIdsByDistrict.get(districtId)
        if (districtFileIds === undefined) {
            fileIdsByDistrict.set(districtId, [file.id])
        } else if (districtFileIds.includes(file.id) === false) {
            districtFileIds.push(file.id)
        }

        const districtOwnerIds = ownerIdsByDistrict.get(districtId)
        if (districtOwnerIds === undefined) {
            ownerIdsByDistrict.set(districtId, new Set<string>([relation.ownerId]))
        } else {
            districtOwnerIds.add(relation.ownerId)
        }
    }

    return Array.from(fileIdsByDistrict.entries())
        .map(([districtId, fileIds]): ICityBusFactorOverlayEntry | undefined => {
            const primaryFileId = fileIds[0]
            if (primaryFileId === undefined) {
                return undefined
            }
            const contributorCount = ownerIdsByDistrict.get(districtId)?.size ?? 0
            const busFactor = Math.max(1, contributorCount)

            return {
                busFactor,
                districtId,
                districtLabel: districtId,
                fileCount: fileIds.length,
                fileIds,
                primaryFileId,
            }
        })
        .filter((entry): entry is ICityBusFactorOverlayEntry => entry !== undefined)
        .sort((leftEntry, rightEntry): number => {
            if (leftEntry.busFactor !== rightEntry.busFactor) {
                return leftEntry.busFactor - rightEntry.busFactor
            }
            return rightEntry.fileCount - leftEntry.fileCount
        })
}

/**
 * Формирует цветовую карту district -> color для bus factor overlay.
 *
 * @param entries District bus factor entries.
 * @returns Color map для package-level раскраски.
 */
function buildBusFactorPackageColorByName(
    entries: ReadonlyArray<ICityBusFactorOverlayEntry>,
): Readonly<Record<string, string>> | undefined {
    const packageColorByName: Record<string, string> = {}
    for (const entry of entries) {
        packageColorByName[entry.districtId] = resolveBusFactorDistrictColor(entry.busFactor)
    }
    return Object.keys(packageColorByName).length === 0 ? undefined : packageColorByName
}

/**
 * Формирует knowledge silo entries с агрегированным risk score.
 *
 * @param files Файлы текущего профиля.
 * @param ownership Маппинг владения файлами.
 * @returns Список silo entries, отсортированный по риску.
 */
function buildKnowledgeSiloPanelEntries(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    ownership: ReadonlyArray<ICodeCityDashboardOwnershipDescriptor>,
): ReadonlyArray<IKnowledgeSiloPanelEntry> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )
    const fileIdsBySilo = new Map<string, string[]>()
    const ownerIdsBySilo = new Map<string, Set<string>>()
    const complexityBySilo = new Map<string, number>()
    const churnBySilo = new Map<string, number>()

    for (const relation of ownership) {
        const file = fileById.get(relation.fileId)
        if (file === undefined) {
            continue
        }

        const siloId = resolveDistrictName(file.path)
        const siloFileIds = fileIdsBySilo.get(siloId)
        if (siloFileIds === undefined) {
            fileIdsBySilo.set(siloId, [file.id])
            complexityBySilo.set(siloId, file.complexity ?? 0)
            churnBySilo.set(siloId, file.churn ?? 0)
        } else if (siloFileIds.includes(file.id) === false) {
            siloFileIds.push(file.id)
            complexityBySilo.set(siloId, (complexityBySilo.get(siloId) ?? 0) + (file.complexity ?? 0))
            churnBySilo.set(siloId, (churnBySilo.get(siloId) ?? 0) + (file.churn ?? 0))
        }

        const siloOwnerIds = ownerIdsBySilo.get(siloId)
        if (siloOwnerIds === undefined) {
            ownerIdsBySilo.set(siloId, new Set<string>([relation.ownerId]))
        } else {
            siloOwnerIds.add(relation.ownerId)
        }
    }

    return Array.from(fileIdsBySilo.entries())
        .map(([siloId, fileIds]): IKnowledgeSiloPanelEntry | undefined => {
            const primaryFileId = fileIds[0]
            if (primaryFileId === undefined) {
                return undefined
            }
            const contributorCount = ownerIdsBySilo.get(siloId)?.size ?? 0
            const ownershipRisk = contributorCount <= 1 ? 65 : contributorCount === 2 ? 40 : 18
            const complexityRisk = Math.min(20, Math.round((complexityBySilo.get(siloId) ?? 0) / 2))
            const churnRisk = Math.min(14, Math.round((churnBySilo.get(siloId) ?? 0) * 2))
            const riskScore = Math.max(1, Math.min(99, ownershipRisk + complexityRisk + churnRisk))

            return {
                contributorCount: Math.max(1, contributorCount),
                fileCount: fileIds.length,
                fileIds,
                primaryFileId,
                riskScore,
                siloId,
                siloLabel: siloId,
            }
        })
        .filter((entry): entry is IKnowledgeSiloPanelEntry => entry !== undefined)
        .sort((leftEntry, rightEntry): number => rightEntry.riskScore - leftEntry.riskScore)
}

/**
 * Формирует узлы графа контрибьюторов для contributor collaboration view.
 *
 * @param contributors Справочник контрибьюторов.
 * @returns Нормализованные graph nodes.
 */
function buildContributorGraphNodes(
    contributors: ReadonlyArray<ICodeCityDashboardContributorDescriptor>,
): ReadonlyArray<IContributorCollaborationNode> {
    return contributors.map((entry): IContributorCollaborationNode => {
        return {
            commitCount: entry.commitCount,
            contributorId: entry.ownerId,
            label: entry.ownerName,
        }
    })
}

/**
 * Формирует ребра совместной работы для contributor graph.
 *
 * @param collaborations Co-authoring связи профиля.
 * @returns Graph edges.
 */
function buildContributorGraphEdges(
    collaborations: ReadonlyArray<ICodeCityDashboardContributorCollaborationDescriptor>,
): ReadonlyArray<IContributorCollaborationEdge> {
    return collaborations.map((entry): IContributorCollaborationEdge => {
        return {
            coAuthorCount: entry.coAuthorCount,
            sourceContributorId: entry.sourceOwnerId,
            targetContributorId: entry.targetOwnerId,
        }
    })
}

/**
 * Формирует модель для change risk gauge.
 *
 * @param seeds Impact seeds текущего профиля.
 * @param healthTrend Исторический тренд health score.
 * @returns Текущий риск и historical points.
 */
function buildChangeRiskGaugeModel(
    seeds: ReadonlyArray<IImpactAnalysisSeed>,
    healthTrend: ReadonlyArray<IHealthTrendPoint>,
): {
    readonly currentScore: number
    readonly historicalPoints: ReadonlyArray<IChangeRiskGaugePoint>
} {
    const currentScore =
        seeds.length === 0
            ? 0
            : Math.round(
                  seeds.slice(0, 3).reduce((total, seed): number => total + seed.riskScore, 0) /
                      Math.min(3, seeds.length),
              )

    const historicalPoints = healthTrend.slice(-3).map((point): IChangeRiskGaugePoint => {
        const riskFromHealth = Math.max(0, Math.min(100, 100 - point.healthScore))
        const date = new Date(point.timestamp)
        return {
            label: `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}`,
            score: riskFromHealth,
        }
    })

    return {
        currentScore,
        historicalPoints,
    }
}

/**
 * Формирует impact graph модель (nodes + edges).
 *
 * @param seeds Impact seeds.
 * @returns Граф propagation.
 */
function buildImpactGraphModel(seeds: ReadonlyArray<IImpactAnalysisSeed>): {
    readonly nodes: ReadonlyArray<IImpactGraphNode>
    readonly edges: ReadonlyArray<IImpactGraphEdge>
} {
    const nodes = seeds.slice(0, 6).map((seed, index): IImpactGraphNode => {
        return {
            depth: index === 0 ? 0 : 1,
            id: seed.fileId,
            impactScore: seed.riskScore,
            label: seed.label,
        }
    })

    const edges: Array<IImpactGraphEdge> = []
    for (let index = 0; index < nodes.length - 1; index += 1) {
        const sourceNode = nodes[index]
        const targetNode = nodes[index + 1]
        if (sourceNode !== undefined && targetNode !== undefined) {
            edges.push({
                id: `impact-edge-${sourceNode.id}-${targetNode.id}`,
                sourceId: sourceNode.id,
                targetId: targetNode.id,
            })
        }
    }

    return {
        edges,
        nodes,
    }
}

/**
 * Формирует what-if options на основе impact seeds.
 *
 * @param seeds Impact seeds текущего профиля.
 * @returns Опции multi-file сценария.
 */
function buildWhatIfOptions(seeds: ReadonlyArray<IImpactAnalysisSeed>): ReadonlyArray<IWhatIfOption> {
    return seeds.slice(0, 6).map((seed): IWhatIfOption => {
        return {
            affectedCount:
                seed.affectedFiles.length + seed.affectedTests.length + seed.affectedConsumers.length,
            fileId: seed.fileId,
            id: `what-if-${seed.id}`,
            impactScore: seed.riskScore,
            label: seed.label,
        }
    })
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
    const [activeBusFactorDistrictId, setActiveBusFactorDistrictId] = useState<string | undefined>()
    const [activeKnowledgeSiloId, setActiveKnowledgeSiloId] = useState<string | undefined>()
    const [activeContributorId, setActiveContributorId] = useState<string | undefined>()
    const [isOwnershipOverlayEnabled, setOwnershipOverlayEnabled] = useState<boolean>(true)
    const [activeOwnershipOwnerId, setActiveOwnershipOwnerId] = useState<string | undefined>()
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
    const cityRefactoringOverlayEntries = buildCityRefactoringOverlayEntries(refactoringTargets)
    const refactoringTimelineTasks = buildRefactoringTimelineTasks(refactoringTargets)
    const impactAnalysisSeeds = buildImpactAnalysisSeeds(currentProfile.files)
    const cityImpactOverlayEntries = buildCityImpactOverlayEntries(impactAnalysisSeeds)
    const busFactorOverlayEntries = buildBusFactorOverlayEntries(
        currentProfile.files,
        currentProfile.ownership,
    )
    const busFactorPackageColorByName = buildBusFactorPackageColorByName(
        busFactorOverlayEntries,
    )
    const knowledgeSiloEntries = buildKnowledgeSiloPanelEntries(
        currentProfile.files,
        currentProfile.ownership,
    )
    const contributorGraphNodes = buildContributorGraphNodes(currentProfile.contributors)
    const contributorGraphEdges = buildContributorGraphEdges(
        currentProfile.contributorCollaborations,
    )
    const ownershipOverlayEntries = buildOwnershipOverlayEntries(
        currentProfile.files,
        currentProfile.contributors,
        currentProfile.ownership,
    )
    const ownershipFileColorById = buildOwnershipFileColorById(
        ownershipOverlayEntries,
        isOwnershipOverlayEnabled,
    )
    const changeRiskGaugeModel = buildChangeRiskGaugeModel(
        impactAnalysisSeeds,
        currentProfile.healthTrend,
    )
    const impactGraphModel = buildImpactGraphModel(impactAnalysisSeeds)
    const whatIfOptions = buildWhatIfOptions(impactAnalysisSeeds)
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
        setActiveBusFactorDistrictId(undefined)
        setActiveKnowledgeSiloId(undefined)
        setActiveContributorId(undefined)
        setActiveOwnershipOwnerId(undefined)
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
                    <p className="text-sm font-semibold text-slate-900">City refactoring overlay</p>
                </CardHeader>
                <CardBody>
                    <CityRefactoringOverlay
                        entries={cityRefactoringOverlayEntries}
                        onSelectEntry={(entry): void => {
                            setHighlightedFileId(entry.fileId)
                            setExploreNavigationFocus({
                                activeFileId: entry.fileId,
                                chainFileIds: [entry.fileId],
                                title: `Refactor overlay: ${entry.label}`,
                            })
                            markAreaExplored("city-3d")
                        }}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Simulation panel</p>
                </CardHeader>
                <CardBody>
                    <SimulationPanel
                        onPreviewScenario={(scenario): void => {
                            const primaryFileId = scenario.fileIds[0]
                            if (primaryFileId !== undefined) {
                                setHighlightedFileId(primaryFileId)
                            }
                            setExploreNavigationFocus({
                                activeFileId: primaryFileId,
                                chainFileIds: scenario.fileIds,
                                title:
                                    scenario.mode === "after"
                                        ? "Simulation after refactoring"
                                        : "Simulation baseline",
                            })
                            markAreaExplored("city-3d")
                        }}
                        targets={refactoringTargets}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Refactoring timeline</p>
                </CardHeader>
                <CardBody>
                    <RefactoringTimeline
                        onSelectTask={(task): void => {
                            setHighlightedFileId(task.fileId)
                            setExploreNavigationFocus({
                                activeFileId: task.fileId,
                                chainFileIds: [task.fileId],
                                title: `Refactoring timeline: ${task.title}`,
                            })
                            markAreaExplored("city-3d")
                        }}
                        tasks={refactoringTimelineTasks}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">
                        Refactoring export dialog
                    </p>
                </CardHeader>
                <CardBody>
                    <RefactoringExportDialog
                        onExport={(payload): void => {
                            const primaryFileId = payload.fileIds[0]
                            if (primaryFileId !== undefined) {
                                setHighlightedFileId(primaryFileId)
                            }
                            setExploreNavigationFocus({
                                activeFileId: primaryFileId,
                                chainFileIds: payload.fileIds,
                                title: `Export plan: ${payload.destination}`,
                            })
                            markAreaExplored("city-3d")
                        }}
                        targets={refactoringTargets}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Impact analysis panel</p>
                </CardHeader>
                <CardBody>
                    <ImpactAnalysisPanel
                        onApplyImpact={(selection): void => {
                            setHighlightedFileId(selection.fileId)
                            setExploreNavigationFocus({
                                activeFileId: selection.fileId,
                                chainFileIds: [
                                    selection.fileId,
                                    ...selection.affectedFiles.filter((fileId): boolean => {
                                        return fileId !== selection.fileId
                                    }),
                                ],
                                title: `Impact analysis: ${selection.label}`,
                            })
                            markAreaExplored("city-3d")
                        }}
                        seeds={impactAnalysisSeeds}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">City impact overlay</p>
                </CardHeader>
                <CardBody>
                    <CityImpactOverlay
                        entries={cityImpactOverlayEntries}
                        onSelectEntry={(entry): void => {
                            setHighlightedFileId(entry.fileId)
                            setExploreNavigationFocus({
                                activeFileId: entry.fileId,
                                chainFileIds: [entry.fileId],
                                title: `Impact overlay: ${entry.label}`,
                            })
                            markAreaExplored("city-3d")
                        }}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Ownership overlay</p>
                </CardHeader>
                <CardBody>
                    <CityOwnershipOverlay
                        activeOwnerId={activeOwnershipOwnerId}
                        isEnabled={isOwnershipOverlayEnabled}
                        onSelectOwner={(owner): void => {
                            setOwnershipOverlayEnabled(true)
                            setActiveOwnershipOwnerId(owner.ownerId)
                            setHighlightedFileId(owner.primaryFileId)
                            setExploreNavigationFocus({
                                activeFileId: owner.primaryFileId,
                                chainFileIds: owner.fileIds,
                                title: `Ownership: ${owner.ownerName}`,
                            })
                            markAreaExplored("controls")
                            markAreaExplored("city-3d")
                        }}
                        onToggleEnabled={(nextEnabled): void => {
                            setOwnershipOverlayEnabled(nextEnabled)
                            if (nextEnabled === false) {
                                setActiveOwnershipOwnerId(undefined)
                            }
                            markAreaExplored("controls")
                        }}
                        owners={ownershipOverlayEntries}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Bus factor overlay</p>
                </CardHeader>
                <CardBody>
                    <CityBusFactorOverlay
                        activeDistrictId={activeBusFactorDistrictId}
                        entries={busFactorOverlayEntries}
                        onSelectEntry={(entry): void => {
                            setActiveBusFactorDistrictId(entry.districtId)
                            setHighlightedFileId(entry.primaryFileId)
                            setExploreNavigationFocus({
                                activeFileId: entry.primaryFileId,
                                chainFileIds: entry.fileIds,
                                title: `Bus factor: ${entry.districtLabel}`,
                            })
                            markAreaExplored("controls")
                            markAreaExplored("city-3d")
                        }}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Knowledge silo panel</p>
                </CardHeader>
                <CardBody>
                    <KnowledgeSiloPanel
                        activeSiloId={activeKnowledgeSiloId}
                        entries={knowledgeSiloEntries}
                        onSelectEntry={(entry): void => {
                            setActiveKnowledgeSiloId(entry.siloId)
                            setHighlightedFileId(entry.primaryFileId)
                            setExploreNavigationFocus({
                                activeFileId: entry.primaryFileId,
                                chainFileIds: entry.fileIds,
                                title: `Knowledge silo: ${entry.siloLabel}`,
                            })
                            markAreaExplored("controls")
                            markAreaExplored("city-3d")
                        }}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">
                        Contributor collaboration graph
                    </p>
                </CardHeader>
                <CardBody>
                    <ContributorCollaborationGraph
                        activeContributorId={activeContributorId}
                        collaborations={contributorGraphEdges}
                        contributors={contributorGraphNodes}
                        onSelectContributor={(contributorId): void => {
                            const ownerOverlayEntry = ownershipOverlayEntries.find(
                                (entry): boolean => entry.ownerId === contributorId,
                            )
                            const activeFileId = ownerOverlayEntry?.primaryFileId

                            setActiveContributorId(contributorId)
                            setActiveOwnershipOwnerId(contributorId)
                            setOwnershipOverlayEnabled(true)
                            if (activeFileId !== undefined) {
                                setHighlightedFileId(activeFileId)
                            }
                            setExploreNavigationFocus({
                                activeFileId,
                                chainFileIds: ownerOverlayEntry?.fileIds ?? [],
                                title: `Contributor graph: ${ownerOverlayEntry?.ownerName ?? contributorId}`,
                            })
                            markAreaExplored("controls")
                            markAreaExplored("city-3d")
                        }}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Change risk gauge</p>
                </CardHeader>
                <CardBody>
                    <ChangeRiskGauge
                        currentScore={changeRiskGaugeModel.currentScore}
                        historicalPoints={changeRiskGaugeModel.historicalPoints}
                        onSelectHistoricalPoint={(point): void => {
                            const primaryImpactSeed = impactAnalysisSeeds[0]
                            const activeFileId =
                                primaryImpactSeed === undefined ? undefined : primaryImpactSeed.fileId
                            if (activeFileId !== undefined) {
                                setHighlightedFileId(activeFileId)
                            }
                            setExploreNavigationFocus({
                                activeFileId,
                                chainFileIds: activeFileId === undefined ? [] : [activeFileId],
                                title: `Risk gauge: ${point.label}`,
                            })
                            markAreaExplored("city-3d")
                        }}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Impact graph view</p>
                </CardHeader>
                <CardBody>
                    <ImpactGraphView
                        edges={impactGraphModel.edges}
                        nodes={impactGraphModel.nodes}
                        onFocusNode={(node): void => {
                            setHighlightedFileId(node.id)
                            setExploreNavigationFocus({
                                activeFileId: node.id,
                                chainFileIds: [node.id],
                                title: `Impact graph: ${node.label}`,
                            })
                            markAreaExplored("city-3d")
                        }}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">What-if panel</p>
                </CardHeader>
                <CardBody>
                    <WhatIfPanel
                        onRunScenario={(selection): void => {
                            const primaryFileId = selection.fileIds[0]
                            if (primaryFileId !== undefined) {
                                setHighlightedFileId(primaryFileId)
                            }
                            setExploreNavigationFocus({
                                activeFileId: primaryFileId,
                                chainFileIds: selection.fileIds,
                                title: `What-if: ${String(selection.fileIds.length)} files`,
                            })
                            markAreaExplored("city-3d")
                        }}
                        options={whatIfOptions}
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
                        fileColorById={ownershipFileColorById}
                        packageColorByName={busFactorPackageColorByName}
                        temporalCouplings={overlayTemporalCouplings}
                        title={`${currentProfile.label} treemap`}
                    />
                </CardBody>
            </Card>
        </section>
    )
}
