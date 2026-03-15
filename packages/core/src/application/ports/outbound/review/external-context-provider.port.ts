import type {
    IAsanaTask,
    IBugsnagError,
    IClickUpTask,
    ExternalContextSource,
    IExternalContext,
    IJiraTicket,
    ILinearIssue,
    ISentryError,
} from "../../../dto/review/external-context.dto"

/**
 * Base provider contract for external context enrichment.
 */
export interface IExternalContextProvider {
    /**
     * External system identifier.
     */
    readonly source: ExternalContextSource

    /**
     * Loads context for identifier and normalizes result to shared payload.
     *
     * @param identifier Platform resource identifier.
     * @returns Shared external context payload or null when not found.
     */
    loadContext(identifier: string): Promise<IExternalContext | null>
}

/**
 * Jira-specific provider contract.
 */
export interface IJiraProvider {
    /**
     * Loads Jira ticket by key.
     *
     * @param ticketKey Jira issue key.
     * @returns Jira ticket payload or null when not found.
     */
    getTicket(ticketKey: string): Promise<IJiraTicket | null>
}

/**
 * Linear-specific provider contract.
 */
export interface ILinearProvider {
    /**
     * Loads Linear issue by identifier.
     *
     * @param issueId Linear issue identifier.
     * @returns Linear issue payload or null when not found.
     */
    getIssue(issueId: string): Promise<ILinearIssue | null>
}

/**
 * Asana-specific provider contract.
 */
export interface IAsanaProvider {
    /**
     * Loads Asana task by identifier.
     *
     * @param taskId Asana task identifier.
     * @returns Asana task payload or null when not found.
     */
    getTask(taskId: string): Promise<IAsanaTask | null>
}

/**
 * ClickUp-specific provider contract.
 */
export interface IClickUpProvider {
    /**
     * Loads ClickUp task by identifier.
     *
     * @param taskId ClickUp task identifier.
     * @returns ClickUp task payload or null when not found.
     */
    getTask(taskId: string): Promise<IClickUpTask | null>
}

/**
 * Sentry-specific provider contract.
 */
export interface ISentryProvider {
    /**
     * Loads Sentry error by identifier.
     *
     * @param errorId Sentry error identifier.
     * @returns Sentry error payload or null when not found.
     */
    getError(errorId: string): Promise<ISentryError | null>
}

/**
 * Bugsnag-specific provider contract.
 */
export interface IBugsnagProvider {
    /**
     * Loads Bugsnag error by identifier.
     *
     * @param errorId Bugsnag error identifier.
     * @returns Bugsnag error payload or null when not found.
     */
    getError(errorId: string): Promise<IBugsnagError | null>
}
