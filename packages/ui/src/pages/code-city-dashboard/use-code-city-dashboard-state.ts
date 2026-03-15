import { type ChangeEvent, useMemo, useState } from "react"

import type { TCausalOverlayMode } from "@/components/graphs/causal-overlay-selector"
import type { IGuidedTourStep } from "@/components/graphs/guided-tour-overlay"
import type { IRootCauseChainFocusPayload } from "@/components/graphs/root-cause-chain-viewer"
import type {
    TCodeCityDashboardMetric,
    IExploreNavigationFocusState,
    TDashboardOnboardingAreaId,
} from "./code-city-dashboard-types"
import {
    CODE_CITY_DASHBOARD_REPOSITORIES,
    CODE_CITY_GUIDED_TOUR_STEPS,
} from "./code-city-dashboard-mock-data"
import {
    DEFAULT_DASHBOARD_REPOSITORY,
    resolveDashboardProfile,
    isCodeCityMetric,
    resolveRepositoryOptions,
    createRepositoryFilesLink,
    resolveOnboardingAreaFromTourStep,
} from "./code-city-dashboard-utils"
import { buildRootCauseIssues, buildCausalCouplings } from "./builders/root-cause-builders"

import {
    buildOnboardingProgressModules,
    buildExploreModePaths,
    buildHotAreaHighlights,
} from "./builders/explore-onboarding-builders"
import {
    buildRefactoringTargets,
    buildCityRefactoringOverlayEntries,
    buildRefactoringTimelineTasks,
    buildImpactAnalysisSeeds,
    buildCityImpactOverlayEntries,
    buildChangeRiskGaugeModel,
    buildImpactGraphModel,
    buildWhatIfOptions,
} from "./builders/impact-builders"
import {
    buildPredictionOverlayEntries,
    buildPredictionDashboardHotspots,
    buildPredictionQualityTrendPoints,
    buildTrendForecastChartPoints,
    buildPredictionAccuracyPoints,
    buildPredictionConfusionMatrix,
    buildPredictionAccuracyCases,
    buildPredictionAlertModules,
    resolvePredictionAlertFocusFileId,
    buildPredictionComparisonSnapshots,
    buildPredictionBugProneFiles,
    buildPredictionExplainEntries,
    buildPredictedRiskByFileId,
} from "./builders/prediction-builders"
import {
    buildSprintComparisonSnapshots,
    buildDistrictTrendIndicators,
    buildSprintAchievements,
    buildTeamLeaderboardEntries,
    buildSprintSummaryCardModel,
    buildTrendTimelineEntries,
} from "./builders/sprint-gamification-builders"
import {
    buildOwnershipOverlayEntries,
    buildOwnershipFileColorById,
    buildBusFactorOverlayEntries,
    buildBusFactorPackageColorByName,
    buildBusFactorTrendSeries,
    buildKnowledgeSiloPanelEntries,
    buildKnowledgeMapExportModel,
    buildContributorGraphNodes,
    buildContributorGraphEdges,
    buildOwnershipTransitionEvents,
} from "./builders/ownership-knowledge-builders"

/**
 * Custom hook, инкапсулирующий всё состояние и вычисления CodeCity dashboard.
 *
 * @param initialRepositoryId Идентификатор репозитория по умолчанию.
 * @returns Состояние, вычисленные данные и обработчики событий.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- ReturnType used as exported type alias
export function useCodeCityDashboardState(initialRepositoryId?: string) {
    const repositoryOptions = useMemo(
        (): ReadonlyArray<string> => resolveRepositoryOptions(CODE_CITY_DASHBOARD_REPOSITORIES),
        [],
    )

    const resolvedInitialRepositoryId = useMemo((): string => {
        if (initialRepositoryId === undefined) {
            return DEFAULT_DASHBOARD_REPOSITORY.id
        }
        if (repositoryOptions.includes(initialRepositoryId)) {
            return initialRepositoryId
        }
        return DEFAULT_DASHBOARD_REPOSITORY.id
    }, [initialRepositoryId, repositoryOptions])

    const [repositoryId, setRepositoryId] = useState<string>(resolvedInitialRepositoryId)
    const [metric, setMetric] = useState<TCodeCityDashboardMetric>("complexity")
    const [overlayMode, setOverlayMode] = useState<TCausalOverlayMode>("impact")
    const [exploreNavigationFocus, setExploreNavigationFocus] =
        useState<IExploreNavigationFocusState>({
            chainFileIds: [],
            title: "",
        })
    const [highlightedFileId, setHighlightedFileId] = useState<string | undefined>()
    const [activeBusFactorDistrictId, setActiveBusFactorDistrictId] = useState<string | undefined>()
    const [activeBusFactorTrendModuleId, setActiveBusFactorTrendModuleId] = useState<
        string | undefined
    >()
    const [activePredictionFileId, setActivePredictionFileId] = useState<string | undefined>()
    const [activePredictionHotspotId, setActivePredictionHotspotId] = useState<string | undefined>()
    const [activeTrendForecastPointId, setActiveTrendForecastPointId] = useState<
        string | undefined
    >()
    const [activePredictionAccuracyCaseId, setActivePredictionAccuracyCaseId] = useState<
        string | undefined
    >()
    const [activePredictionComparisonSnapshotId, setActivePredictionComparisonSnapshotId] =
        useState<string | undefined>()
    const [activeSprintComparisonSnapshotId, setActiveSprintComparisonSnapshotId] = useState<
        string | undefined
    >()
    const [activeDistrictTrendId, setActiveDistrictTrendId] = useState<string | undefined>()
    const [activeAchievementId, setActiveAchievementId] = useState<string | undefined>()
    const [activeTeamLeaderboardOwnerId, setActiveTeamLeaderboardOwnerId] = useState<
        string | undefined
    >()
    const [activeSprintSummaryMetricId, setActiveSprintSummaryMetricId] = useState<
        string | undefined
    >()
    const [activeTrendTimelineEntryId, setActiveTrendTimelineEntryId] = useState<
        string | undefined
    >()
    const [activeKnowledgeSiloId, setActiveKnowledgeSiloId] = useState<string | undefined>()
    const [activeContributorId, setActiveContributorId] = useState<string | undefined>()
    const [activeOwnershipTransitionId, setActiveOwnershipTransitionId] = useState<
        string | undefined
    >()
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

    const guidedTourSteps = useMemo(
        (): ReadonlyArray<IGuidedTourStep> =>
            customTourSteps.length > 0 ? customTourSteps : CODE_CITY_GUIDED_TOUR_STEPS,
        [customTourSteps],
    )

    const activeGuidedTourStep = useMemo((): IGuidedTourStep | undefined => {
        return (
            guidedTourSteps[
                Math.max(0, Math.min(guidedTourStepIndex, guidedTourSteps.length - 1))
            ] ?? guidedTourSteps[0]
        )
    }, [guidedTourSteps, guidedTourStepIndex])

    const currentProfile = useMemo(() => resolveDashboardProfile(repositoryId), [repositoryId])

    const rootCauseIssues = useMemo(
        () => buildRootCauseIssues(currentProfile.files),
        [currentProfile],
    )

    const causalCouplings = useMemo(
        () => buildCausalCouplings(currentProfile.temporalCouplings),
        [currentProfile],
    )

    const exploreModePaths = useMemo(
        () => buildExploreModePaths(currentProfile.files),
        [currentProfile],
    )

    const hotAreaHighlights = useMemo(
        () => buildHotAreaHighlights(currentProfile.files),
        [currentProfile],
    )

    const refactoringTargets = useMemo(
        () => buildRefactoringTargets(currentProfile.files),
        [currentProfile],
    )

    const cityRefactoringOverlayEntries = useMemo(
        () => buildCityRefactoringOverlayEntries(refactoringTargets),
        [refactoringTargets],
    )

    const refactoringTimelineTasks = useMemo(
        () => buildRefactoringTimelineTasks(refactoringTargets),
        [refactoringTargets],
    )

    const impactAnalysisSeeds = useMemo(
        () => buildImpactAnalysisSeeds(currentProfile.files),
        [currentProfile],
    )

    const cityImpactOverlayEntries = useMemo(
        () => buildCityImpactOverlayEntries(impactAnalysisSeeds),
        [impactAnalysisSeeds],
    )

    const predictionOverlayEntries = useMemo(
        () => buildPredictionOverlayEntries(currentProfile.files),
        [currentProfile],
    )

    const predictionDashboardHotspots = useMemo(
        () => buildPredictionDashboardHotspots(currentProfile.files, predictionOverlayEntries),
        [currentProfile, predictionOverlayEntries],
    )

    const predictionQualityTrendPoints = useMemo(
        () => buildPredictionQualityTrendPoints(currentProfile.healthTrend),
        [currentProfile],
    )

    const trendForecastPoints = useMemo(
        () => buildTrendForecastChartPoints(currentProfile.healthTrend, predictionOverlayEntries),
        [currentProfile, predictionOverlayEntries],
    )

    const predictionAccuracyPoints = useMemo(
        () => buildPredictionAccuracyPoints(currentProfile.healthTrend),
        [currentProfile],
    )

    const predictionConfusionMatrix = useMemo(
        () => buildPredictionConfusionMatrix(predictionOverlayEntries),
        [predictionOverlayEntries],
    )

    const predictionAccuracyCases = useMemo(
        () => buildPredictionAccuracyCases(currentProfile.files, predictionOverlayEntries),
        [currentProfile, predictionOverlayEntries],
    )

    const predictionAlertModules = useMemo(
        () => buildPredictionAlertModules(currentProfile.files),
        [currentProfile],
    )

    const predictionComparisonSnapshots = useMemo(
        () => buildPredictionComparisonSnapshots(currentProfile.files, predictionOverlayEntries),
        [currentProfile, predictionOverlayEntries],
    )

    const sprintComparisonSnapshots = useMemo(
        () => buildSprintComparisonSnapshots(currentProfile.files),
        [currentProfile],
    )

    const districtTrendIndicators = useMemo(
        () => buildDistrictTrendIndicators(currentProfile.files),
        [currentProfile],
    )

    const sprintAchievements = useMemo(
        () => buildSprintAchievements(currentProfile.files),
        [currentProfile],
    )

    const teamLeaderboardEntries = useMemo(
        () =>
            buildTeamLeaderboardEntries(
                currentProfile.files,
                currentProfile.contributors,
                currentProfile.ownership,
            ),
        [currentProfile],
    )

    const sprintSummaryModel = useMemo(
        () =>
            buildSprintSummaryCardModel(
                currentProfile.files,
                sprintComparisonSnapshots,
                sprintAchievements,
                districtTrendIndicators,
            ),
        [currentProfile, sprintComparisonSnapshots, sprintAchievements, districtTrendIndicators],
    )

    const trendTimelineEntries = useMemo(
        () =>
            buildTrendTimelineEntries(
                currentProfile.files,
                currentProfile.healthTrend,
                sprintComparisonSnapshots,
            ),
        [currentProfile, sprintComparisonSnapshots],
    )

    const predictionBugProneFiles = useMemo(
        () => buildPredictionBugProneFiles(currentProfile.files, predictionOverlayEntries),
        [currentProfile, predictionOverlayEntries],
    )

    const predictionExplainEntries = useMemo(
        () => buildPredictionExplainEntries(currentProfile.files, predictionOverlayEntries),
        [currentProfile, predictionOverlayEntries],
    )

    const predictedRiskByFileId = useMemo(
        () => buildPredictedRiskByFileId(predictionOverlayEntries),
        [predictionOverlayEntries],
    )

    const busFactorOverlayEntries = useMemo(
        () => buildBusFactorOverlayEntries(currentProfile.files, currentProfile.ownership),
        [currentProfile],
    )

    const busFactorPackageColorByName = useMemo(
        () => buildBusFactorPackageColorByName(busFactorOverlayEntries),
        [busFactorOverlayEntries],
    )

    const busFactorTrendSeries = useMemo(
        () => buildBusFactorTrendSeries(busFactorOverlayEntries),
        [busFactorOverlayEntries],
    )

    const knowledgeSiloEntries = useMemo(
        () => buildKnowledgeSiloPanelEntries(currentProfile.files, currentProfile.ownership),
        [currentProfile],
    )

    const contributorGraphNodes = useMemo(
        () => buildContributorGraphNodes(currentProfile.contributors),
        [currentProfile],
    )

    const contributorGraphEdges = useMemo(
        () => buildContributorGraphEdges(currentProfile.contributorCollaborations),
        [currentProfile],
    )

    const ownershipTransitionEvents = useMemo(
        () =>
            buildOwnershipTransitionEvents(
                currentProfile.files,
                currentProfile.contributors,
                currentProfile.ownership,
            ),
        [currentProfile],
    )

    const ownershipOverlayEntries = useMemo(
        () =>
            buildOwnershipOverlayEntries(
                currentProfile.files,
                currentProfile.contributors,
                currentProfile.ownership,
            ),
        [currentProfile],
    )

    const knowledgeMapExportModel = useMemo(
        () =>
            buildKnowledgeMapExportModel(
                currentProfile,
                metric,
                ownershipOverlayEntries,
                busFactorOverlayEntries,
                knowledgeSiloEntries,
            ),
        [
            currentProfile,
            metric,
            ownershipOverlayEntries,
            busFactorOverlayEntries,
            knowledgeSiloEntries,
        ],
    )

    const ownershipFileColorById = useMemo(
        () => buildOwnershipFileColorById(ownershipOverlayEntries, isOwnershipOverlayEnabled),
        [ownershipOverlayEntries, isOwnershipOverlayEnabled],
    )

    const changeRiskGaugeModel = useMemo(
        () => buildChangeRiskGaugeModel(impactAnalysisSeeds, currentProfile.healthTrend),
        [impactAnalysisSeeds, currentProfile],
    )

    const impactGraphModel = useMemo(
        () => buildImpactGraphModel(impactAnalysisSeeds),
        [impactAnalysisSeeds],
    )

    const whatIfOptions = useMemo(
        () => buildWhatIfOptions(impactAnalysisSeeds),
        [impactAnalysisSeeds],
    )

    const onboardingProgressModules = useMemo(
        () => buildOnboardingProgressModules(exploredAreaIds),
        [exploredAreaIds],
    )

    const fileLink = useMemo(() => createRepositoryFilesLink(currentProfile.id), [currentProfile])

    const overlayImpactedFiles = useMemo(
        () => (overlayMode === "impact" ? currentProfile.impactedFiles : []),
        [overlayMode, currentProfile],
    )

    const overlayTemporalCouplings = useMemo(
        () => (overlayMode === "temporal-coupling" ? currentProfile.temporalCouplings : []),
        [overlayMode, currentProfile],
    )

    const overlayRootCauseIssues = useMemo(
        () => (overlayMode === "root-cause" ? rootCauseIssues : []),
        [overlayMode, rootCauseIssues],
    )

    const overlayCausalCouplings = useMemo(
        () => (overlayMode === "temporal-coupling" ? causalCouplings : []),
        [overlayMode, causalCouplings],
    )

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
        setActiveBusFactorTrendModuleId(undefined)
        setActivePredictionFileId(undefined)
        setActivePredictionHotspotId(undefined)
        setActiveTrendForecastPointId(undefined)
        setActivePredictionAccuracyCaseId(undefined)
        setActivePredictionComparisonSnapshotId(undefined)
        setActiveSprintComparisonSnapshotId(undefined)
        setActiveDistrictTrendId(undefined)
        setActiveAchievementId(undefined)
        setActiveTeamLeaderboardOwnerId(undefined)
        setActiveSprintSummaryMetricId(undefined)
        setActiveTrendTimelineEntryId(undefined)
        setActiveKnowledgeSiloId(undefined)
        setActiveContributorId(undefined)
        setActiveOwnershipTransitionId(undefined)
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

        return "ring-2 ring-accent/80 ring-offset-2 ring-offset-surface"
    }

    const handleTourNext = (): void => {
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
    }

    const handleTourPrevious = (): void => {
        setGuidedTourStepIndex((currentStepIndex): number => {
            return Math.max(0, currentStepIndex - 1)
        })
    }

    const handleTourSkip = (): void => {
        setIsGuidedTourActive(false)
    }

    return {
        repositoryId,
        repositoryOptions,
        metric,
        overlayMode,
        exploreNavigationFocus,
        highlightedFileId,
        activeBusFactorDistrictId,
        activeBusFactorTrendModuleId,
        activePredictionFileId,
        activePredictionHotspotId,
        activeTrendForecastPointId,
        activePredictionAccuracyCaseId,
        activePredictionComparisonSnapshotId,
        activeSprintComparisonSnapshotId,
        activeDistrictTrendId,
        activeAchievementId,
        activeTeamLeaderboardOwnerId,
        activeSprintSummaryMetricId,
        activeTrendTimelineEntryId,
        activeKnowledgeSiloId,
        activeContributorId,
        activeOwnershipTransitionId,
        isOwnershipOverlayEnabled,
        activeOwnershipOwnerId,
        guidedTourStepIndex,
        isGuidedTourActive,
        guidedTourSteps,
        rootCauseChainFocus,
        currentProfile,
        rootCauseIssues,
        causalCouplings,
        exploreModePaths,
        hotAreaHighlights,
        refactoringTargets,
        cityRefactoringOverlayEntries,
        refactoringTimelineTasks,
        impactAnalysisSeeds,
        cityImpactOverlayEntries,
        predictionOverlayEntries,
        predictionDashboardHotspots,
        predictionQualityTrendPoints,
        trendForecastPoints,
        predictionAccuracyPoints,
        predictionConfusionMatrix,
        predictionAccuracyCases,
        predictionAlertModules,
        predictionComparisonSnapshots,
        sprintComparisonSnapshots,
        districtTrendIndicators,
        sprintAchievements,
        teamLeaderboardEntries,
        sprintSummaryModel,
        trendTimelineEntries,
        predictionBugProneFiles,
        predictionExplainEntries,
        predictedRiskByFileId,
        busFactorOverlayEntries,
        busFactorPackageColorByName,
        busFactorTrendSeries,
        knowledgeSiloEntries,
        contributorGraphNodes,
        contributorGraphEdges,
        ownershipTransitionEvents,
        ownershipOverlayEntries,
        knowledgeMapExportModel,
        ownershipFileColorById,
        changeRiskGaugeModel,
        impactGraphModel,
        whatIfOptions,
        onboardingProgressModules,
        fileLink,
        overlayImpactedFiles,
        overlayTemporalCouplings,
        overlayRootCauseIssues,
        overlayCausalCouplings,
        markAreaExplored,
        handleRepositoryChange,
        handleMetricChange,
        handleOverlayModeChange,
        handleRootCauseChainFocusChange,
        handleTourStepsChange,
        resolveTourCardClassName,
        handleTourNext,
        handleTourPrevious,
        handleTourSkip,
        setHighlightedFileId,
        setActiveBusFactorDistrictId,
        setActiveBusFactorTrendModuleId,
        setActivePredictionFileId,
        setActivePredictionHotspotId,
        setActiveTrendForecastPointId,
        setActivePredictionAccuracyCaseId,
        setActivePredictionComparisonSnapshotId,
        setActiveSprintComparisonSnapshotId,
        setActiveDistrictTrendId,
        setActiveAchievementId,
        setActiveTeamLeaderboardOwnerId,
        setActiveSprintSummaryMetricId,
        setActiveTrendTimelineEntryId,
        setActiveKnowledgeSiloId,
        setActiveContributorId,
        setActiveOwnershipTransitionId,
        setOwnershipOverlayEnabled,
        setActiveOwnershipOwnerId,
        setExploreNavigationFocus,
        resolvePredictionAlertFocusFileId: (moduleIds: ReadonlyArray<string>): string | undefined =>
            resolvePredictionAlertFocusFileId(moduleIds, currentProfile.files),
    }
}

/**
 * Тип возвращаемого значения хука useCodeCityDashboardState.
 */
export type ICodeCityDashboardState = ReturnType<typeof useCodeCityDashboardState>
