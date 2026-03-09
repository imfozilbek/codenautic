/**
 * Supported external context source systems.
 */
export const EXTERNAL_CONTEXT_SOURCE = ["JIRA", "LINEAR", "SENTRY", "DATADOG", "POSTHOG"] as const

/**
 * Union of supported external context source systems.
 */
export type ExternalContextSource =
    (typeof EXTERNAL_CONTEXT_SOURCE)[number]

/**
 * Normalized external context payload shared across providers and pipeline enrichment.
 */
export interface IExternalContext {
    /**
     * External source that produced the context.
     */
    readonly source: ExternalContextSource

    /**
     * Unvalidated platform-specific context payload.
     */
    readonly data: unknown

    /**
     * Fetch timestamp.
     */
    readonly fetchedAt: Date
}

/**
 * External issue model for Jira platform.
 */
export interface IJiraTicket {
    /**
     * Jira issue key.
     */
    readonly key: string

    /**
     * Human-readable issue summary.
     */
    readonly summary: string

    /**
     * Current workflow status.
     */
    readonly status: string

    /**
     * Optional normalized issue description.
     */
    readonly description?: string

    /**
     * Optional normalized acceptance-criteria checklist.
     */
    readonly acceptanceCriteria?: readonly string[]

    /**
     * Optional active sprint name.
     */
    readonly sprint?: string
}

/**
 * External issue model for Linear platform.
 */
export interface ILinearProjectContext {
    /**
     * Linear project identifier.
     */
    readonly id: string

    /**
     * Human-readable project name.
     */
    readonly name: string

    /**
     * Optional normalized project description.
     */
    readonly description?: string

    /**
     * Optional normalized project state label.
     */
    readonly state?: string

    /**
     * Optional normalized project priority label.
     */
    readonly priority?: string
}

/**
 * External sub-issue model for Linear platform.
 */
export interface ILinearSubIssue {
    /**
     * Stable sub-issue identifier.
     */
    readonly id: string

    /**
     * Human-readable sub-issue title.
     */
    readonly title: string

    /**
     * Current workflow state label.
     */
    readonly state: string

    /**
     * Optional normalized sub-issue priority label.
     */
    readonly priority?: string
}

/**
 * External issue model for Linear platform.
 */
export interface ILinearIssue {
    /**
     * Stable issue identifier.
     */
    readonly id: string

    /**
     * Human-readable issue title.
     */
    readonly title: string

    /**
     * Current workflow state label.
     */
    readonly state: string

    /**
     * Optional normalized issue description.
     */
    readonly description?: string

    /**
     * Optional normalized priority label.
     */
    readonly priority?: string

    /**
     * Optional cycle name when issue belongs to a cycle.
     */
    readonly cycle?: string

    /**
     * Optional parent project context.
     */
    readonly project?: ILinearProjectContext

    /**
     * Optional normalized list of child issues.
     */
    readonly subIssues?: readonly ILinearSubIssue[]
}

/**
 * External error model for Sentry platform.
 */
export interface ISentryError {
    /**
     * Stable Sentry issue identifier.
     */
    readonly id: string

    /**
     * Human-readable issue title.
     */
    readonly title: string

    /**
     * Normalized stack trace lines.
     */
    readonly stackTrace: readonly string[]

    /**
     * Optional normalized issue frequency.
     */
    readonly frequency?: number

    /**
     * Optional normalized number of affected users.
     */
    readonly affectedUsers?: number
}
