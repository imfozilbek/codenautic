/**
 * Barrel exports for navigation: route guards, deep link guards,
 * breadcrumbs, and settings navigation items.
 */
export {
    type IDeepLinkGuardResult,
    sanitizeDeepLinkPath,
    resolveDeepLinkGuard,
} from "./deep-link-guard"
export {
    type TTenantId,
    type IRouteGuardContext,
    type IBreadcrumbSegment,
    type INavigationRouteEntry,
    ROUTE_GUARD_MAP,
    getBreadcrumbs,
    getBreadcrumbsWithPaths,
    isRouteAccessible,
    searchAccessibleRoutes,
} from "./route-guard-map"
export {
    type ISettingsNavItem,
    type ISettingsNavGroup,
    createSettingsNavGroups,
    createSettingsNavItems,
} from "./settings-nav-items"
export { translateRouteLabelKey } from "./route-guard-map"
