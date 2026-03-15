/**
 * Normalized Datadog alert used by context enrichment.
 */
export interface IDatadogAlert {
    /**
     * Stable Datadog monitor identifier.
     */
    readonly id: string

    /**
     * Human-readable monitor title.
     */
    readonly title: string

    /**
     * Monitor runtime status.
     */
    readonly status: string

    /**
     * Optional monitor query expression.
     */
    readonly query?: string

    /**
     * Optional normalized monitor tags.
     */
    readonly tags?: readonly string[]

    /**
     * Optional normalized severity label.
     */
    readonly severity?: string

    /**
     * Optional monitor trigger timestamp in ISO format.
     */
    readonly triggeredAt?: string
}

/**
 * Normalized Datadog log entry used by context enrichment.
 */
export interface IDatadogLogEntry {
    /**
     * Stable Datadog log identifier.
     */
    readonly id: string

    /**
     * Log timestamp in ISO format.
     */
    readonly timestamp: string

    /**
     * Human-readable log message.
     */
    readonly message: string

    /**
     * Optional service label.
     */
    readonly service?: string

    /**
     * Optional log status label.
     */
    readonly status?: string

    /**
     * Optional source file path extracted from log payload.
     */
    readonly filePath?: string
}

/**
 * Normalized Datadog context payload.
 */
export interface IDatadogContextData {
    /**
     * Datadog alert details.
     */
    readonly alert: IDatadogAlert

    /**
     * Datadog log entries correlated with alert.
     */
    readonly logs: readonly IDatadogLogEntry[]

    /**
     * Optional affected source file paths inferred from logs.
     */
    readonly affectedCodePaths?: readonly string[]
}
