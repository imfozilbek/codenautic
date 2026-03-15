import type {IBugsnagBreadcrumb, IBugsnagError} from "@codenautic/core"

/**
 * Normalized Bugsnag context payload.
 */
export interface IBugsnagContextData {
    /**
     * Bugsnag error details.
     */
    readonly error: IBugsnagError

    /**
     * Optional flattened breadcrumbs list.
     */
    readonly breadcrumbs?: readonly IBugsnagBreadcrumb[]
}
