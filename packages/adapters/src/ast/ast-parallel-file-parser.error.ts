/**
 * Typed error codes for AST parallel file parser.
 */
export const AST_PARALLEL_FILE_PARSER_ERROR_CODE = {
    INVALID_CONCURRENCY: "INVALID_CONCURRENCY",
    INVALID_CONTENT: "INVALID_CONTENT",
    INVALID_DEFAULT_CONCURRENCY: "INVALID_DEFAULT_CONCURRENCY",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_LANGUAGE: "INVALID_LANGUAGE",
    INVALID_WORKER_TASK_EXECUTOR: "INVALID_WORKER_TASK_EXECUTOR",
} as const

/**
 * AST parallel file parser error code literal.
 */
export type AstParallelFileParserErrorCode =
    (typeof AST_PARALLEL_FILE_PARSER_ERROR_CODE)[keyof typeof AST_PARALLEL_FILE_PARSER_ERROR_CODE]

/**
 * Structured metadata for AST parallel file parser failures.
 */
export interface IAstParallelFileParserErrorDetails {
    /**
     * Invalid repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid language when available.
     */
    readonly language?: string

    /**
     * Invalid numeric value when available.
     */
    readonly value?: number
}

/**
 * Typed AST parallel file parser error with stable metadata.
 */
export class AstParallelFileParserError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstParallelFileParserErrorCode

    /**
     * Invalid repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid language when available.
     */
    public readonly language?: string

    /**
     * Invalid numeric value when available.
     */
    public readonly value?: number

    /**
     * Creates typed AST parallel file parser error.
     *
     * @param code Stable machine-readable error code.
     * @param details Structured metadata payload.
     */
    public constructor(
        code: AstParallelFileParserErrorCode,
        details: IAstParallelFileParserErrorDetails = {},
    ) {
        super(createAstParallelFileParserErrorMessage(code, details))

        this.name = "AstParallelFileParserError"
        this.code = code
        this.filePath = details.filePath
        this.language = details.language
        this.value = details.value
    }
}

/**
 * Builds stable public message for parallel file parser failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Structured metadata payload.
 * @returns Stable public message.
 */
function createAstParallelFileParserErrorMessage(
    code: AstParallelFileParserErrorCode,
    details: IAstParallelFileParserErrorDetails,
): string {
    return AST_PARALLEL_FILE_PARSER_ERROR_MESSAGES[code](details)
}

const AST_PARALLEL_FILE_PARSER_ERROR_MESSAGES: Readonly<
    Record<AstParallelFileParserErrorCode, (details: IAstParallelFileParserErrorDetails) => string>
> = {
    INVALID_CONCURRENCY: (details) =>
        `Invalid concurrency for parallel file parser: ${details.value ?? Number.NaN}`,
    INVALID_CONTENT: () => "Parallel file parser content must be a string",
    INVALID_DEFAULT_CONCURRENCY: (details) =>
        `Invalid defaultConcurrency for parallel file parser: ${details.value ?? Number.NaN}`,
    INVALID_FILE_PATH: (details) =>
        `Invalid filePath for parallel file parser: ${details.filePath ?? "<empty>"}`,
    INVALID_LANGUAGE: (details) =>
        `Invalid language for parallel file parser: ${details.language ?? "<empty>"}`,
    INVALID_WORKER_TASK_EXECUTOR: () =>
        "Parallel file parser workerTaskExecutor must implement execute(input)",
}
