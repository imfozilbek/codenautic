import { vi } from "vitest"

import type { ICodeCityDashboardState } from "@/pages/code-city-dashboard/use-code-city-dashboard-state"

/**
 * Создает мок-состояние CodeCity dashboard для тестирования секций.
 *
 * @param overrides Частичные переопределения полей.
 * @returns Мок-объект ICodeCityDashboardState.
 */
export function createMockCodeCityState(
    overrides: Partial<ICodeCityDashboardState> = {},
): ICodeCityDashboardState {
    return {
        repositoryId: "repo-1",
        repositoryOptions: ["repo-1", "repo-2"],
        metric: "complexity",
        overlayMode: "impact",
        highlightedFileId: undefined,
        exploreNavigationFocus: {
            chainFileIds: [],
            title: "",
        },
        rootCauseChainFocus: {
            chainFileIds: [],
            issueId: "",
            issueTitle: "",
        },
        currentProfile: {
            id: "repo-1",
            label: "Repository Alpha",
            description: "Test repository",
            files: [
                {
                    id: "file-1",
                    path: "src/index.ts",
                    extension: "ts",
                    language: "typescript",
                    size: 100,
                    lines: 50,
                    complexity: 8,
                    churn: 3,
                    coverage: 85,
                    contributors: ["alice"],
                    lastModified: "2025-01-01",
                    package: "core",
                },
            ],
            compareFiles: [],
            healthTrend: [{ period: "2025-W01", score: 80 }],
            temporalCouplings: [],
            contributors: [{ id: "alice", name: "Alice", commits: 10 }],
            ownership: [{ fileId: "file-1", ownerId: "alice", percentage: 100 }],
        },
        changeRiskGaugeModel: {
            currentScore: 72,
            historicalPoints: [
                { label: "W01", score: 70 },
                { label: "W02", score: 72 },
            ],
        },
        impactGraphModel: {
            nodes: [{ id: "n1", label: "core", group: "package" }],
            edges: [{ source: "n1", target: "n1", weight: 1 }],
        },
        whatIfOptions: [{ id: "opt-1", label: "Remove file", fileIds: ["file-1"] }],
        impactAnalysisSeeds: [{ fileId: "file-1", label: "index.ts", weight: 1 }],
        refactoringTargets: [
            {
                fileId: "file-1",
                title: "Simplify index",
                module: "core",
                roiScore: 80,
                riskScore: 30,
                effortScore: 20,
            },
        ],
        cityRefactoringOverlayEntries: [
            {
                fileId: "file-1",
                label: "index.ts",
                priority: "high" as const,
                details: "High churn",
            },
        ],
        refactoringTimelineTasks: [
            { fileId: "file-1", title: "Refactor index", week: "W03", effort: 2 },
        ],
        cityImpactOverlayEntries: [{ fileId: "file-1", label: "index.ts", impactScore: 75 }],
        predictionOverlayEntries: [
            { fileId: "file-1", label: "index.ts", risk: "medium" as const, confidence: 0.8 },
        ],
        predictionDashboardHotspots: [
            { id: "hs-1", fileId: "file-1", label: "index.ts hotspot", risk: "medium" as const },
        ],
        predictionBugProneFiles: [{ fileId: "file-1", label: "index.ts", bugProbability: 0.6 }],
        predictionQualityTrendPoints: [{ period: "W01", score: 80 }],
        predictionExplainEntries: [
            { fileId: "file-1", label: "index.ts", explanation: "High churn" },
        ],
        trendForecastPoints: [{ id: "tf-1", timestamp: "2025-W05", score: 75, fileId: "file-1" }],
        predictionAccuracyPoints: [{ period: "W01", accuracy: 0.85 }],
        predictionConfusionMatrix: {
            truePositive: 10,
            trueNegative: 80,
            falsePositive: 5,
            falseNegative: 5,
        },
        predictionAccuracyCases: [
            {
                id: "pac-1",
                fileId: "file-1",
                label: "index.ts case",
                prediction: "medium" as const,
            },
        ],
        predictionAlertModules: [{ id: "mod-1", name: "core", fileCount: 5 }],
        predictionComparisonSnapshots: [
            { id: "snap-1", periodLabel: "W01 vs W02", fileId: "file-1" },
        ],
        sprintComparisonSnapshots: [{ id: "sprint-snap-1", title: "Sprint 1", fileId: "file-1" }],
        districtTrendIndicators: [
            {
                districtId: "d1",
                districtLabel: "Core",
                primaryFileId: "file-1",
                affectedFileIds: ["file-1"],
                trend: "up" as const,
            },
        ],
        sprintAchievements: [
            {
                id: "ach-1",
                title: "First fix",
                fileId: "file-1",
                relatedFileIds: ["file-1"],
            },
        ],
        teamLeaderboardEntries: [
            {
                ownerId: "alice",
                ownerName: "Alice",
                primaryFileId: "file-1",
                fileIds: ["file-1"],
                score: 95,
            },
        ],
        sprintSummaryModel: {
            sprintLabel: "Sprint 1",
            metrics: [
                {
                    id: "m1",
                    label: "Velocity",
                    value: 42,
                    focusFileId: "file-1",
                    focusFileIds: ["file-1"],
                },
            ],
        },
        trendTimelineEntries: [
            {
                id: "tle-1",
                sprintLabel: "Sprint 1",
                focusFileId: "file-1",
                focusFileIds: ["file-1"],
            },
        ],
        ownershipOverlayEntries: [
            {
                ownerId: "alice",
                ownerName: "Alice",
                primaryFileId: "file-1",
                fileIds: ["file-1"],
                color: "#ff0000",
            },
        ],
        ownershipFileColorById: { "file-1": "#ff0000" },
        busFactorOverlayEntries: [
            {
                districtId: "d1",
                districtLabel: "Core",
                primaryFileId: "file-1",
                fileIds: ["file-1"],
                busFactor: 1,
            },
        ],
        busFactorPackageColorByName: { core: "#00ff00" },
        busFactorTrendSeries: [
            { moduleId: "d1", moduleLabel: "Core", primaryFileId: "file-1", points: [] },
        ],
        knowledgeSiloEntries: [
            {
                siloId: "silo-1",
                siloLabel: "Core silo",
                primaryFileId: "file-1",
                fileIds: ["file-1"],
            },
        ],
        knowledgeMapExportModel: { availableFormats: ["json", "csv"] },
        contributorGraphNodes: [{ id: "alice", label: "Alice" }],
        contributorGraphEdges: [{ source: "alice", target: "alice", weight: 1 }],
        ownershipTransitionEvents: [
            {
                id: "ote-1",
                fileId: "file-1",
                fromOwnerId: "alice",
                toOwnerId: "bob",
                scopeLabel: "index.ts",
            },
        ],
        predictedRiskByFileId: { "file-1": "medium" as const },
        isOwnershipOverlayEnabled: true,
        activeOwnershipOwnerId: undefined,
        activeBusFactorDistrictId: undefined,
        activeBusFactorTrendModuleId: undefined,
        activeKnowledgeSiloId: undefined,
        activeContributorId: undefined,
        activeOwnershipTransitionId: undefined,
        activePredictionFileId: undefined,
        activePredictionHotspotId: undefined,
        activeTrendForecastPointId: undefined,
        activePredictionAccuracyCaseId: undefined,
        activePredictionComparisonSnapshotId: undefined,
        activeSprintComparisonSnapshotId: undefined,
        activeDistrictTrendId: undefined,
        activeAchievementId: undefined,
        activeTeamLeaderboardOwnerId: undefined,
        activeSprintSummaryMetricId: undefined,
        activeTrendTimelineEntryId: undefined,
        isGuidedTourActive: true,
        guidedTourStepIndex: 0,
        guidedTourSteps: [
            { id: "step-1", title: "Welcome", description: "Tour start", targetArea: "controls" },
        ],
        onboardingProgressModules: [
            { id: "m1", title: "Explore city", description: "Walk around", isComplete: false },
        ],
        exploreModePaths: [
            {
                id: "path-1",
                title: "Backend path",
                role: "backend",
                description: "Explore backend",
                fileChainIds: ["file-1"],
            },
        ],
        hotAreaHighlights: [
            {
                fileId: "file-1",
                label: "index.ts",
                description: "Hot file",
                severity: "high" as const,
            },
        ],
        overlayRootCauseIssues: [],
        overlayCausalCouplings: [],
        overlayImpactedFiles: [],
        overlayTemporalCouplings: [],
        handleRepositoryChange: vi.fn(),
        handleMetricChange: vi.fn(),
        handleOverlayModeChange: vi.fn(),
        handleRootCauseChainFocusChange: vi.fn(),
        handleTourNext: vi.fn(),
        handleTourPrevious: vi.fn(),
        handleTourSkip: vi.fn(),
        handleTourStepsChange: vi.fn(),
        setHighlightedFileId: vi.fn(),
        setExploreNavigationFocus: vi.fn(),
        setOwnershipOverlayEnabled: vi.fn(),
        setActiveOwnershipOwnerId: vi.fn(),
        setActiveBusFactorDistrictId: vi.fn(),
        setActiveBusFactorTrendModuleId: vi.fn(),
        setActiveKnowledgeSiloId: vi.fn(),
        setActiveContributorId: vi.fn(),
        setActiveOwnershipTransitionId: vi.fn(),
        setActivePredictionFileId: vi.fn(),
        setActivePredictionHotspotId: vi.fn(),
        setActiveTrendForecastPointId: vi.fn(),
        setActivePredictionAccuracyCaseId: vi.fn(),
        setActivePredictionComparisonSnapshotId: vi.fn(),
        setActiveSprintComparisonSnapshotId: vi.fn(),
        setActiveDistrictTrendId: vi.fn(),
        setActiveAchievementId: vi.fn(),
        setActiveTeamLeaderboardOwnerId: vi.fn(),
        setActiveSprintSummaryMetricId: vi.fn(),
        setActiveTrendTimelineEntryId: vi.fn(),
        markAreaExplored: vi.fn(),
        resolveTourCardClassName: vi.fn((): string => ""),
        fileLink: vi.fn((): string => "/files/file-1"),
        resolvePredictionAlertFocusFileId: vi.fn((): string | undefined => "file-1"),
        ...overrides,
    } as unknown as ICodeCityDashboardState
}
