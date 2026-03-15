import type {IPostHogFeatureFlag} from "@codenautic/core"

/**
 * Normalized PostHog context payload.
 */
export interface IPostHogContextData {
    /**
     * PostHog feature-flag details.
     */
    readonly featureFlag: IPostHogFeatureFlag

    /**
     * Current rollout status.
     */
    readonly status: string

    /**
     * Optional rollout percentage in [0, 100].
     */
    readonly rolloutPercentage?: number

    /**
     * Optional variant key when multivariate rollout is active.
     */
    readonly variant?: string
}
