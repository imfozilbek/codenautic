/**
 * Barrel exports for components/graphs.
 *
 * Re-exports all graph visualisation components, overlays, panels,
 * utilities and their associated types. Story files and worker files
 * are excluded. The codecity-3d-scene-renderer module is a barrel
 * re-export from the codecity-3d subdirectory.
 */

export {
    AchievementsPanel,
    type IAchievementPanelEntry,
    type IAchievementsPanelProps,
    type TAchievementBadge,
} from "./achievements-panel"
export {
    AlertConfigDialog,
    type IAlertConfigDialogModule,
    type IAlertConfigDialogProps,
    type IAlertConfigDialogValue,
    type TAlertConfigChannel,
    type TAlertConfigFrequency,
} from "./alert-config-dialog"
export {
    BusFactorTrendChart,
    type IBusFactorTrendChartProps,
    type IBusFactorTrendPoint,
    type IBusFactorTrendSeries,
} from "./bus-factor-trend-chart"
export { CausalOverlaySelector, type TCausalOverlayMode } from "./causal-overlay-selector"
export {
    ChangeRiskGauge,
    type IChangeRiskGaugePoint,
    type IChangeRiskGaugeProps,
} from "./change-risk-gauge"
export {
    ChurnComplexityScatter,
    type IChurnComplexityScatterFileDescriptor,
    type IChurnComplexityScatterProps,
    type IScatterPoint,
} from "./churn-complexity-scatter"
export {
    CityBusFactorOverlay,
    type ICityBusFactorOverlayEntry,
    type ICityBusFactorOverlayProps,
} from "./city-bus-factor-overlay"
export {
    CityImpactOverlay,
    type ICityImpactOverlayEntry,
    type ICityImpactOverlayProps,
} from "./city-impact-overlay"
export {
    CityOwnershipOverlay,
    type ICityOwnershipOverlayOwnerEntry,
    type ICityOwnershipOverlayProps,
} from "./city-ownership-overlay"
export {
    CityPredictionOverlay,
    type ICityPredictionOverlayEntry,
    type ICityPredictionOverlayProps,
} from "./city-prediction-overlay"
export {
    CityRefactoringOverlay,
    type ICityRefactoringOverlayEntry,
    type ICityRefactoringOverlayProps,
    type TCityRefactoringPriority,
} from "./city-refactoring-overlay"
export {
    CodeCity3DSceneRenderer,
    createCodeCityLayoutWorker,
    createCodeCityBuildingMeshes,
    createCodeCityDistrictMeshes,
    createCodeCityBuildingImpactMap,
    resolveCodeCityBuildingColor,
    resolveCodeCityBugEmissionSettings,
    resolveCodeCityHealthAuraColor,
    createCodeCityDistrictHealthAuras,
    resolveCodeCityBuildingImpactProfile,
    resolveCodeCityRenderBudget,
    resolveCodeCityCausalArcColor,
    createCodeCityCausalArcs,
    createCodeCityNavigationTrail,
    type ICodeCityBuildingMesh,
    type ICodeCityDistrictMesh,
} from "./codecity-3d-scene-renderer"
export {
    CodeCity3DScene,
    type ICodeCity3DCausalCouplingDescriptor,
    type ICodeCity3DSceneFileDescriptor,
    type ICodeCity3DSceneImpactedFileDescriptor,
    type ICodeCity3DSceneProps,
    type TCodeCityCameraPreset,
    type TCodeCityCausalCouplingType,
    type TCodeCityImpactType,
} from "./codecity-3d-scene"
export {
    CodeCityTreemap,
    buildCodeCityTreemapData,
    type ICodeCityTreemapData,
    type ICodeCityTreemapFileDescriptor,
    type ICodeCityTreemapFileLinkResolver,
    type ICodeCityTreemapImpactedFileDescriptor,
    type ICodeCityTreemapProps,
    type ICodeCityTreemapTemporalCouplingDescriptor,
    type TCodeCityTreemapPredictionRiskLevel,
} from "./codecity-treemap"
export {
    ContributorCollaborationGraph,
    type IContributorCollaborationEdge,
    type IContributorCollaborationGraphProps,
    type IContributorCollaborationNode,
} from "./contributor-collaboration-graph"
export {
    DistrictTrendIndicators,
    type IDistrictTrendIndicatorEntry,
    type IDistrictTrendIndicatorsProps,
    type TDistrictTrendDirection,
} from "./district-trend-indicators"
export {
    ExploreModeSidebar,
    type IExploreModePathDescriptor,
    type IExploreModeSidebarProps,
} from "./explore-mode-sidebar"
export {
    FileDependencyGraph,
    buildFileDependencyGraphData,
    type IFileDependencyGraphData,
    type IFileDependencyGraphProps,
    type IFileDependencyNode,
    type IFileDependencyRelation,
} from "./file-dependency-graph"
export {
    FunctionClassCallGraph,
    buildFunctionCallGraphData,
    type IFunctionCallGraphData,
    type IFunctionCallGraphProps,
    type IFunctionCallNode,
    type IFunctionCallRelation,
} from "./function-class-call-graph"
export {
    buildGraphExportFileName,
    buildGraphSvg,
    exportGraphAsJson,
    exportGraphAsPng,
    exportGraphAsSvg,
    resolveGraphPngCanvasSize,
} from "./graph-export"
export {
    GuidedTourOverlay,
    type IGuidedTourOverlayProps,
    type IGuidedTourStep,
} from "./guided-tour-overlay"
export {
    HealthTrendChart,
    type IHealthTrendChartProps,
    type IHealthTrendPoint,
} from "./health-trend-chart"
export {
    HotAreaHighlights,
    type IHotAreaHighlightDescriptor,
    type IHotAreaHighlightsProps,
    type THotAreaSeverity,
} from "./hot-area-highlights"
export {
    ImpactAnalysisPanel,
    type IImpactAnalysisPanelProps,
    type IImpactAnalysisSeed,
    type IImpactAnalysisSelection,
} from "./impact-analysis-panel"
export {
    ImpactGraphView,
    type IImpactGraphEdge,
    type IImpactGraphNode,
    type IImpactGraphViewProps,
} from "./impact-graph-view"
export {
    KnowledgeMapExportWidget,
    type IKnowledgeMapExportWidgetProps,
    type TKnowledgeMapExportFormat,
} from "./knowledge-map-export-widget"
export {
    buildKnowledgeMapExportFileName,
    buildKnowledgeMapExportSvg,
    exportKnowledgeMapAsPng,
    exportKnowledgeMapAsSvg,
    type IKnowledgeMapExportDistrictRiskEntry,
    type IKnowledgeMapExportMetadata,
    type IKnowledgeMapExportModel,
    type IKnowledgeMapExportOwnerLegendEntry,
    type IKnowledgeMapExportSiloEntry,
} from "./knowledge-map-export"
export {
    KnowledgeSiloPanel,
    type IKnowledgeSiloPanelEntry,
    type IKnowledgeSiloPanelProps,
} from "./knowledge-silo-panel"
export {
    OnboardingProgressTracker,
    type IOnboardingProgressModuleDescriptor,
    type IOnboardingProgressTrackerProps,
} from "./onboarding-progress-tracker"
export {
    OwnershipTransitionWidget,
    type IOwnershipTransitionEvent,
    type IOwnershipTransitionWidgetProps,
    type TOwnershipTransitionHandoffSeverity,
} from "./ownership-transition-widget"
export {
    PackageDependencyGraph,
    buildPackageDependencyGraphData,
    type IPackageDependencyGraphData,
    type IPackageDependencyGraphProps,
    type IPackageDependencyNode,
    type IPackageDependencyRelation,
} from "./package-dependency-graph"
export {
    PredictionAccuracyWidget,
    type IPredictionAccuracyCase,
    type IPredictionAccuracyPoint,
    type IPredictionAccuracyWidgetProps,
    type IPredictionConfusionMatrix,
} from "./prediction-accuracy-widget"
export {
    PredictionComparisonView,
    type IPredictionComparisonSnapshot,
    type IPredictionComparisonViewProps,
} from "./prediction-comparison-view"
export {
    PredictionDashboard,
    type IPredictionDashboardBugProneFile,
    type IPredictionDashboardHotspotEntry,
    type IPredictionDashboardProps,
    type IPredictionDashboardQualityTrendPoint,
} from "./prediction-dashboard"
export {
    PredictionExplainPanel,
    type IPredictionExplainPanelEntry,
    type IPredictionExplainPanelProps,
} from "./prediction-explain-panel"
export {
    ProjectOverviewPanel,
    type IProjectOverviewFileDescriptor,
    type IProjectOverviewPanelProps,
} from "./project-overview-panel"
export {
    RefactoringDashboard,
    type IRefactoringDashboardProps,
    type IRefactoringTargetDescriptor,
    type TRefactoringDashboardSortKey,
} from "./refactoring-dashboard"
export {
    RefactoringExportDialog,
    type IRefactoringExportDialogProps,
    type IRefactoringExportPayload,
    type TRefactoringExportDestination,
} from "./refactoring-export-dialog"
export {
    RefactoringTimeline,
    type IRefactoringTimelineProps,
    type IRefactoringTimelineTask,
} from "./refactoring-timeline"
export { ROICalculatorWidget, type IROICalculatorWidgetProps } from "./roi-calculator-widget"
export {
    RootCauseChainViewer,
    type IRootCauseChainFocusPayload,
    type IRootCauseChainNodeDescriptor,
    type IRootCauseIssueDescriptor,
} from "./root-cause-chain-viewer"
export {
    SimulationPanel,
    type IRefactoringSimulationScenario,
    type ISimulationPanelProps,
    type TRefactoringSimulationMode,
} from "./simulation-panel"
export {
    SprintComparisonView,
    type ISprintComparisonMetric,
    type ISprintComparisonSnapshot,
    type ISprintComparisonViewProps,
} from "./sprint-comparison-view"
export {
    SprintSummaryCard,
    type ISprintSummaryCardModel,
    type ISprintSummaryCardProps,
    type ISprintSummaryMetric,
} from "./sprint-summary-card"
export {
    TeamLeaderboard,
    type ITeamLeaderboardEntry,
    type ITeamLeaderboardPeriodScores,
    type ITeamLeaderboardProps,
    type TTeamLeaderboardMetric,
    type TTeamLeaderboardPeriod,
} from "./team-leaderboard"
export { TourCustomizer, type ITourCustomizerProps } from "./tour-customizer"
export {
    TrendForecastChart,
    type ITrendForecastChartPoint,
    type ITrendForecastChartProps,
} from "./trend-forecast-chart"
export {
    TrendTimelineWidget,
    type ITrendTimelineEntry,
    type ITrendTimelineSparklineMetric,
    type ITrendTimelineWidgetProps,
} from "./trend-timeline-widget"
export {
    WhatIfPanel,
    type IWhatIfOption,
    type IWhatIfPanelProps,
    type IWhatIfSelection,
} from "./what-if-panel"
export {
    calculateGraphLayout,
    type IGraphEdge,
    type IGraphLayoutNode,
    type IGraphLayoutOptions,
    type IGraphNode,
    type TGraphLayoutDirection,
} from "./xyflow-graph-layout"
export { XYFlowGraphRenderer } from "./xyflow-graph-renderer"
export { XyFlowGraph, type IGraphScaleBudgetOptions, type IXYFlowGraphProps } from "./xyflow-graph"
