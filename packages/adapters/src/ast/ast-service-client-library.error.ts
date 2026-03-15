/**
 * Typed error codes for AST service client library.
 */
export const AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE = {
    CLIENT_NOT_CONNECTED: "CLIENT_NOT_CONNECTED",
    INVALID_COMMIT_SHA: "INVALID_COMMIT_SHA",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_IDEMPOTENCY_KEY: "INVALID_IDEMPOTENCY_KEY",
    INVALID_REPOSITORY_ID: "INVALID_REPOSITORY_ID",
    INVALID_REQUEST_ID: "INVALID_REQUEST_ID",
    REQUEST_FAILED: "REQUEST_FAILED",
} as const

/**
 * AST service client library error code literal.
 */
export type AstServiceClientLibraryErrorCode =
    (typeof AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE)[keyof typeof AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE]

/**
 * Structured metadata for AST service client library failures.
 */
export interface IAstServiceClientLibraryErrorDetails {
    /**
     * gRPC method name when available.
     */
    readonly methodName?: string

    /**
     * Repository identifier when available.
     */
    readonly repositoryId?: string

    /**
     * Request identifier when available.
     */
    readonly requestId?: string

    /**
     * File path when available.
     */
    readonly filePath?: string

    /**
     * Idempotency key when available.
     */
    readonly idempotencyKey?: string

    /**
     * Underlying error message when available.
     */
    readonly causeMessage?: string
}

/**
 * Typed AST service client library error with stable metadata.
 */
export class AstServiceClientLibraryError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstServiceClientLibraryErrorCode

    /**
     * gRPC method name when available.
     */
    public readonly methodName?: string

    /**
     * Repository identifier when available.
     */
    public readonly repositoryId?: string

    /**
     * Request identifier when available.
     */
    public readonly requestId?: string

    /**
     * File path when available.
     */
    public readonly filePath?: string

    /**
     * Idempotency key when available.
     */
    public readonly idempotencyKey?: string

    /**
     * Underlying error message when available.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed AST service client library error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstServiceClientLibraryErrorCode,
        details: IAstServiceClientLibraryErrorDetails = {},
    ) {
        super(createAstServiceClientLibraryErrorMessage(code, details))

        this.name = "AstServiceClientLibraryError"
        this.code = code
        this.methodName = details.methodName
        this.repositoryId = details.repositoryId
        this.requestId = details.requestId
        this.filePath = details.filePath
        this.idempotencyKey = details.idempotencyKey
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public message for AST service client library failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstServiceClientLibraryErrorMessage(
    code: AstServiceClientLibraryErrorCode,
    details: IAstServiceClientLibraryErrorDetails,
): string {
    return AST_SERVICE_CLIENT_LIBRARY_ERROR_MESSAGES[code](details)
}

const AST_SERVICE_CLIENT_LIBRARY_ERROR_MESSAGES: Readonly<
    Record<
        AstServiceClientLibraryErrorCode,
        (details: IAstServiceClientLibraryErrorDetails) => string
    >
> = {
    CLIENT_NOT_CONNECTED: () => "Ast service client library is not connected",
    INVALID_COMMIT_SHA: () => "Invalid commit sha for ast service client request",
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for ast service client request: ${details.filePath ?? "<empty>"}`,
    INVALID_IDEMPOTENCY_KEY: (details) =>
        `Invalid idempotency key for ast service client request: ${
            details.idempotencyKey ?? "<empty>"
        }`,
    INVALID_REPOSITORY_ID: (details) =>
        `Invalid repository id for ast service client request: ${
            details.repositoryId ?? "<empty>"
        }`,
    INVALID_REQUEST_ID: (details) =>
        `Invalid request id for ast service client request: ${details.requestId ?? "<empty>"}`,
    REQUEST_FAILED: (details) =>
        `Ast service client request failed for ${details.methodName ?? "<unknown>"}: ${
            details.causeMessage ?? "<unknown>"
        }`,
}
