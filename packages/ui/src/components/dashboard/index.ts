/**
 * Barrel exports for components/dashboard.
 *
 * Re-exports all dashboard components, widgets, utilities and their
 * associated types. Story files are excluded.
 */

export { ActivityTimelineItem, type IActivityTimelineItemProps } from "./activity-timeline-item"
export {
    ActivityTimeline,
    type IActivityTimelineEntry,
    type IActivityTimelineProps,
} from "./activity-timeline"
export {
    ArchitectureHealthWidget,
    type IArchitectureHealthWidgetProps,
} from "./architecture-health-widget"
export {
    DashboardContent,
    type IDashboardContentProps,
    type IWorkQueueItem,
} from "./dashboard-content"
export {
    DashboardCriticalSignals,
    type IDashboardCriticalSignalsProps,
} from "./dashboard-critical-signals"
export {
    DashboardDateRangeFilter,
    type IDashboardDateRangeFilterProps,
    type TDashboardDateRange,
} from "./dashboard-date-range-filter"
export { DashboardHeroMetric, type IDashboardHeroMetricProps } from "./dashboard-hero-metric"
export {
    DASHBOARD_LAYOUT_PRESETS,
    resolveDashboardLayoutPreset,
    type IDashboardLayoutPreset,
} from "./dashboard-layouts"
export {
    DashboardScopeFilters,
    type IDashboardScopeFiltersProps,
    type TOrgScope,
    type TRepositoryScope,
    type TTeamScope,
} from "./dashboard-scope-filters"
export {
    DashboardZone,
    type IDashboardZoneProps,
    type TDashboardZonePriority,
} from "./dashboard-zone"
export {
    FlowMetricsWidget,
    type IFlowMetricsPoint,
    type IFlowMetricsWidgetProps,
} from "./flow-metrics-widget"
export { MetricCard, type IMetricCardProps, type TMetricTrendDirection } from "./metric-card"
export { MetricsGrid, type IMetricGridMetric, type IMetricsGridProps } from "./metrics-grid"
export { createScopeChangeHandler } from "./scope-filter-utils"
export {
    StatusDistributionChart,
    type IStatusDistributionChartProps,
    type IStatusDistributionPoint,
} from "./status-distribution-chart"
export {
    TeamActivityWidget,
    type ITeamActivityPoint,
    type ITeamActivityWidgetProps,
} from "./team-activity-widget"
export {
    TokenUsageDashboardWidget,
    type ITokenUsageDashboardWidgetProps,
    type ITokenUsageModelPoint,
    type ITokenUsageTrendPoint,
} from "./token-usage-dashboard-widget"
