/**
 * Barrel exports for lib/hooks.
 *
 * Re-exports all custom React hooks and their associated types
 * from direct hook files and the queries subdirectory.
 */

export { useDashboardShortcuts, type IDashboardShortcutsResult } from "./use-dashboard-shortcuts"
export { useDebounce, useDebounceWithOptions, type IUseDebounceOptions } from "./use-debounce"
export {
    useDebouncedSearch,
    type IUseDebouncedSearchOptions,
    type IUseDebouncedSearchResult,
} from "./use-debounced-search"
export {
    useFilterPersistence,
    type IUseFilterPersistenceOptions,
    type IUseFilterPersistenceResult,
} from "./use-filter-persistence"
export {
    useIntersectionObserver,
    type IUseIntersectionObserverOptions,
    type IUseIntersectionObserverResult,
} from "./use-intersection-observer"
export {
    useKeyboardShortcuts,
    type IUseKeyboardShortcutsArgs,
    type IUseKeyboardShortcutsResult,
} from "./use-keyboard-shortcuts"
export { useMultiTabSync, type IMultiTabSyncResult } from "./use-multi-tab-sync"
export {
    useOrganizationSwitcher,
    type IOrganizationSwitcherResult,
} from "./use-organization-switcher"
export { usePolicyDrift, type IPolicyDriftResult } from "./use-policy-drift"
export { useProviderDegradation, type IProviderDegradationResult } from "./use-provider-degradation"
export { useSessionRecovery, type ISessionRecoveryResult } from "./use-session-recovery"
export {
    useSSEStream,
    type ISSEEventPayload,
    type ISSEStreamEvent,
    type IUseSSEStreamProps,
    type IUseSSEStreamResult,
    type TSSEEventType,
} from "./use-sse"
export {
    useVirtualizedList,
    type IUseVirtualizedListOptions,
    type IUseVirtualizedListResult,
} from "./use-virtualized-list"

export {
    isFeatureFlagEnabled,
    useFeatureFlagsQuery,
    type IFeatureFlagQueryState,
    type IUseFeatureFlagsQueryArgs,
    type IUseFeatureFlagsQueryResult,
    useCodeReview,
    type IUseCodeReviewQueryArgs,
    type IUseCodeReviewResult,
    useCcrWorkspace,
    type IUseCcrWorkspaceArgs,
    type IUseCcrWorkspaceResult,
    useCustomRules,
    type IUseCustomRulesQueryArgs,
    type IUseCustomRulesResult,
    useExternalContext,
    type IUseExternalContextArgs,
    type IUseExternalContextResult,
    useGitProviders,
    type IUseGitProvidersArgs,
    type IUseGitProvidersResult,
    useHealthQuery,
    type IUseHealthQueryArgs,
    type IUseHealthQueryResult,
    useDryRun,
    type IUseDryRunResult,
    useCCRSummary,
    type IUseCcrSummaryArgs,
    type IUseCcrSummaryResult,
    useRepoConfig,
    type IUseRepoConfigArgs,
    type IUseRepoConfigResult,
    useReviewCadence,
    type IUpdateReviewCadenceRequest,
    type IUseReviewCadenceResult,
    DEFAULT_ADMIN_PERMISSIONS,
    isPermissionEnabled,
    usePermissionsQuery,
    type IPermissionsQueryState,
    type IUsePermissionsQueryArgs,
    type IUsePermissionsQueryResult,
} from "./queries"
