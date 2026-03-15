/**
 * Typed error codes for AST shared state detector.
 */
export const AST_SHARED_STATE_DETECTOR_ERROR_CODE = {
    EMPTY_FILE_PATHS: "EMPTY_FILE_PATHS",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_MINIMUM_CONSUMER_COUNT: "INVALID_MINIMUM_CONSUMER_COUNT",
    INVALID_MAX_ISSUES: "INVALID_MAX_ISSUES",
} as const

/**
 * AST shared state detector error code literal.
 */
export type AstSharedStateDetectorErrorCode =
    (typeof AST_SHARED_STATE_DETECTOR_ERROR_CODE)[keyof typeof AST_SHARED_STATE_DETECTOR_ERROR_CODE]

/**
 * Structured metadata for AST shared state detector failures.
 */
export interface IAstSharedStateDetectorErrorDetails {
    /**
     * Invalid repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid minimum consumer count when available.
     */
    readonly minimumConsumerCount?: number

    /**
     * Invalid max issues cap when available.
     */
    readonly maxIssues?: number
}

/**
 * Typed AST shared state detector error with stable metadata.
 */
export class AstSharedStateDetectorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstSharedStateDetectorErrorCode

    /**
     * Invalid repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid minimum consumer count when available.
     */
    public readonly minimumConsumerCount?: number

    /**
     * Invalid max issues cap when available.
     */
    public readonly maxIssues?: number

    /**
     * Creates typed AST shared state detector error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstSharedStateDetectorErrorCode,
        details: IAstSharedStateDetectorErrorDetails = {},
    ) {
        super(createAstSharedStateDetectorErrorMessage(code, details))

        this.name = "AstSharedStateDetectorError"
        this.code = code
        this.filePath = details.filePath
        this.minimumConsumerCount = details.minimumConsumerCount
        this.maxIssues = details.maxIssues
    }
}

/**
 * Builds stable public message for AST shared state detector failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstSharedStateDetectorErrorMessage(
    code: AstSharedStateDetectorErrorCode,
    details: IAstSharedStateDetectorErrorDetails,
): string {
    return AST_SHARED_STATE_DETECTOR_ERROR_MESSAGES[code](details)
}

const AST_SHARED_STATE_DETECTOR_ERROR_MESSAGES: Readonly<
    Record<AstSharedStateDetectorErrorCode, (details: IAstSharedStateDetectorErrorDetails) => string>
> = {
    EMPTY_FILE_PATHS: () => "Shared state detector file path filter cannot be empty",
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for shared state detector: ${details.filePath ?? "<empty>"}`,
    INVALID_MINIMUM_CONSUMER_COUNT: (details) =>
        `Invalid minimum consumer count for shared state detector: ${
            details.minimumConsumerCount ?? Number.NaN
        }`,
    INVALID_MAX_ISSUES: (details) =>
        `Invalid max issues for shared state detector: ${details.maxIssues ?? Number.NaN}`,
}
