/**
 * Supported external context source systems.
 */
export const EXTERNAL_CONTEXT_SOURCE = [
    "JIRA",
    "LINEAR",
    "SENTRY",
    "BUGSNAG",
    "ASANA",
    "CLICKUP",
    "DATADOG",
    "POSTHOG",
] as const

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
 * External project hierarchy model for Asana platform.
 */
export interface IAsanaProjectHierarchy {
    /**
     * Stable Asana project identifier.
     */
    readonly projectId: string

    /**
     * Human-readable Asana project name.
     */
    readonly projectName: string

    /**
     * Optional Asana section identifier.
     */
    readonly sectionId?: string

    /**
     * Optional Asana section name.
     */
    readonly sectionName?: string
}

/**
 * External task model for Asana platform.
 */
export interface IAsanaTask {
    /**
     * Stable Asana task identifier.
     */
    readonly id: string

    /**
     * Human-readable task title.
     */
    readonly title: string

    /**
     * Current workflow status label.
     */
    readonly status: string

    /**
     * Optional normalized task description.
     */
    readonly description?: string

    /**
     * Optional normalized assignee name.
     */
    readonly assignee?: string

    /**
     * Optional due date in ISO format.
     */
    readonly dueDate?: string

    /**
     * Optional project hierarchy associated with task.
     */
    readonly projectHierarchy?: readonly IAsanaProjectHierarchy[]

    /**
     * Optional normalized tag labels.
     */
    readonly tags?: readonly string[]
}

/**
 * External custom-field model for ClickUp task metadata.
 */
export interface IClickUpCustomField {
    /**
     * Stable custom-field identifier.
     */
    readonly id: string

    /**
     * Human-readable custom-field name.
     */
    readonly name: string

    /**
     * Normalized custom-field value.
     */
    readonly value: string
}

/**
 * External task model for ClickUp platform.
 */
export interface IClickUpTask {
    /**
     * Stable ClickUp task identifier.
     */
    readonly id: string

    /**
     * Human-readable task title.
     */
    readonly title: string

    /**
     * Current workflow status label.
     */
    readonly status: string

    /**
     * Optional normalized task description.
     */
    readonly description?: string

    /**
     * Optional normalized assignee name.
     */
    readonly assignee?: string

    /**
     * Optional due date in ISO format.
     */
    readonly dueDate?: string

    /**
     * Optional parent list name.
     */
    readonly listName?: string

    /**
     * Optional normalized task tags.
     */
    readonly tags?: readonly string[]

    /**
     * Optional normalized task custom fields.
     */
    readonly customFields?: readonly IClickUpCustomField[]
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

/**
 * External breadcrumb model for Bugsnag platform.
 */
export interface IBugsnagBreadcrumb {
    /**
     * Breadcrumb message.
     */
    readonly message: string

    /**
     * Optional breadcrumb type.
     */
    readonly type?: string

    /**
     * Optional breadcrumb timestamp in ISO format.
     */
    readonly timestamp?: string
}

/**
 * External error model for Bugsnag platform.
 */
export interface IBugsnagError {
    /**
     * Stable Bugsnag error identifier.
     */
    readonly id: string

    /**
     * Human-readable error title.
     */
    readonly title: string

    /**
     * Normalized stack trace lines.
     */
    readonly stackTrace: readonly string[]

    /**
     * Optional normalized severity.
     */
    readonly severity?: string

    /**
     * Optional normalized breadcrumbs.
     */
    readonly breadcrumbs?: readonly IBugsnagBreadcrumb[]

    /**
     * Optional normalized event count.
     */
    readonly eventCount?: number

    /**
     * Optional normalized number of affected users.
     */
    readonly affectedUsers?: number
}

/**
 * External feature-flag model for PostHog platform.
 */
export interface IPostHogFeatureFlag {
    /**
     * Stable feature flag key.
     */
    readonly key: string

    /**
     * Human-readable feature flag name.
     */
    readonly name: string

    /**
     * Current rollout status.
     */
    readonly status: string

    /**
     * Optional rollout percentage in [0, 100].
     */
    readonly rolloutPercentage?: number

    /**
     * Optional variant key when rollout is multivariate.
     */
    readonly variant?: string

    /**
     * Optional normalized feature flag tags.
     */
    readonly tags?: readonly string[]
}
