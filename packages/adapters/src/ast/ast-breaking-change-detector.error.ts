/**
 * Typed error codes for AST breaking change detector.
 */
export const AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE = {
    EMPTY_FILE_PATHS: "EMPTY_FILE_PATHS",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_MAX_AFFECTED_FILES: "INVALID_MAX_AFFECTED_FILES",
} as const

/**
 * AST breaking change detector error code literal.
 */
export type AstBreakingChangeDetectorErrorCode =
    (typeof AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE)[keyof typeof AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE]

/**
 * Structured metadata for AST breaking change detector failures.
 */
export interface IAstBreakingChangeDetectorErrorDetails {
    /**
     * Invalid repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid max affected files cap when available.
     */
    readonly maxAffectedFiles?: number
}

/**
 * Typed AST breaking change detector error with stable metadata.
 */
export class AstBreakingChangeDetectorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstBreakingChangeDetectorErrorCode

    /**
     * Invalid repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid max affected files cap when available.
     */
    public readonly maxAffectedFiles?: number

    /**
     * Creates typed AST breaking change detector error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstBreakingChangeDetectorErrorCode,
        details: IAstBreakingChangeDetectorErrorDetails = {},
    ) {
        super(createAstBreakingChangeDetectorErrorMessage(code, details))

        this.name = "AstBreakingChangeDetectorError"
        this.code = code
        this.filePath = details.filePath
        this.maxAffectedFiles = details.maxAffectedFiles
    }
}

/**
 * Builds stable public message for AST breaking change detector failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstBreakingChangeDetectorErrorMessage(
    code: AstBreakingChangeDetectorErrorCode,
    details: IAstBreakingChangeDetectorErrorDetails,
): string {
    return AST_BREAKING_CHANGE_DETECTOR_ERROR_MESSAGES[code](details)
}

const AST_BREAKING_CHANGE_DETECTOR_ERROR_MESSAGES: Readonly<
    Record<AstBreakingChangeDetectorErrorCode, (details: IAstBreakingChangeDetectorErrorDetails) => string>
> = {
    EMPTY_FILE_PATHS: () => "Breaking change detector file path filter cannot be empty",
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for breaking change detector: ${details.filePath ?? "<empty>"}`,
    INVALID_MAX_AFFECTED_FILES: (details) =>
        `Invalid max affected files for breaking change detector: ${
            details.maxAffectedFiles ?? Number.NaN
        }`,
}
