/**
 * Typed error codes for AST circular dependency detector.
 */
export const AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE = {
    EMPTY_FILE_PATHS: "EMPTY_FILE_PATHS",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_MINIMUM_CYCLE_SIZE: "INVALID_MINIMUM_CYCLE_SIZE",
    INVALID_MAX_CYCLES: "INVALID_MAX_CYCLES",
} as const

/**
 * AST circular dependency detector error code literal.
 */
export type AstCircularDependencyDetectorErrorCode =
    (typeof AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE)[keyof typeof AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE]

/**
 * Structured metadata for AST circular dependency detector failures.
 */
export interface IAstCircularDependencyDetectorErrorDetails {
    /**
     * Invalid repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid minimum cycle size when available.
     */
    readonly minimumCycleSize?: number

    /**
     * Invalid max cycle count when available.
     */
    readonly maxCycles?: number
}

/**
 * Typed AST circular dependency detector error with stable metadata.
 */
export class AstCircularDependencyDetectorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstCircularDependencyDetectorErrorCode

    /**
     * Invalid repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid minimum cycle size when available.
     */
    public readonly minimumCycleSize?: number

    /**
     * Invalid max cycle count when available.
     */
    public readonly maxCycles?: number

    /**
     * Creates typed AST circular dependency detector error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstCircularDependencyDetectorErrorCode,
        details: IAstCircularDependencyDetectorErrorDetails = {},
    ) {
        super(createAstCircularDependencyDetectorErrorMessage(code, details))

        this.name = "AstCircularDependencyDetectorError"
        this.code = code
        this.filePath = details.filePath
        this.minimumCycleSize = details.minimumCycleSize
        this.maxCycles = details.maxCycles
    }
}

/**
 * Builds stable public message for AST circular dependency detector failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstCircularDependencyDetectorErrorMessage(
    code: AstCircularDependencyDetectorErrorCode,
    details: IAstCircularDependencyDetectorErrorDetails,
): string {
    return AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_MESSAGES[code](details)
}

const AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_MESSAGES: Readonly<
    Record<
        AstCircularDependencyDetectorErrorCode,
        (details: IAstCircularDependencyDetectorErrorDetails) => string
    >
> = {
    EMPTY_FILE_PATHS: () => "Circular dependency detector file path filter cannot be empty",
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for circular dependency detector: ${details.filePath ?? "<empty>"}`,
    INVALID_MINIMUM_CYCLE_SIZE: (details) =>
        `Invalid minimum cycle size for circular dependency detector: ${
            details.minimumCycleSize ?? Number.NaN
        }`,
    INVALID_MAX_CYCLES: (details) =>
        `Invalid max cycles for circular dependency detector: ${details.maxCycles ?? Number.NaN}`,
}
