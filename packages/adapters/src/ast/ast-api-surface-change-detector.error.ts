/**
 * Typed error codes for AST API surface change detector.
 */
export const AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE = {
    EMPTY_FILE_PATHS: "EMPTY_FILE_PATHS",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_MAX_CHANGES: "INVALID_MAX_CHANGES",
} as const

/**
 * AST API surface change detector error code literal.
 */
export type AstApiSurfaceChangeDetectorErrorCode =
    (typeof AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE)[keyof typeof AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE]

/**
 * Structured metadata for AST API surface change detector failures.
 */
export interface IAstApiSurfaceChangeDetectorErrorDetails {
    /**
     * Invalid repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid max changes value when available.
     */
    readonly maxChanges?: number
}

/**
 * Typed AST API surface change detector error with stable metadata.
 */
export class AstApiSurfaceChangeDetectorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstApiSurfaceChangeDetectorErrorCode

    /**
     * Invalid repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid max changes value when available.
     */
    public readonly maxChanges?: number

    /**
     * Creates typed AST API surface change detector error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstApiSurfaceChangeDetectorErrorCode,
        details: IAstApiSurfaceChangeDetectorErrorDetails = {},
    ) {
        super(createAstApiSurfaceChangeDetectorErrorMessage(code, details))

        this.name = "AstApiSurfaceChangeDetectorError"
        this.code = code
        this.filePath = details.filePath
        this.maxChanges = details.maxChanges
    }
}

/**
 * Builds stable public message for AST API surface change detector failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstApiSurfaceChangeDetectorErrorMessage(
    code: AstApiSurfaceChangeDetectorErrorCode,
    details: IAstApiSurfaceChangeDetectorErrorDetails,
): string {
    return AST_API_SURFACE_CHANGE_DETECTOR_ERROR_MESSAGES[code](details)
}

const AST_API_SURFACE_CHANGE_DETECTOR_ERROR_MESSAGES: Readonly<
    Record<AstApiSurfaceChangeDetectorErrorCode, (details: IAstApiSurfaceChangeDetectorErrorDetails) => string>
> = {
    EMPTY_FILE_PATHS: () => "API surface change detector file path filter cannot be empty",
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for API surface change detector: ${details.filePath ?? "<empty>"}`,
    INVALID_MAX_CHANGES: (details) =>
        `Invalid max changes for API surface change detector: ${details.maxChanges ?? Number.NaN}`,
}
