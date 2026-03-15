/**
 * Typed error codes for AST service gRPC server adapter.
 */
export const AST_SERVICE_GRPC_SERVER_ERROR_CODE = {
    HANDLER_ALREADY_REGISTERED: "HANDLER_ALREADY_REGISTERED",
    HANDLER_FAILED: "HANDLER_FAILED",
    INVALID_IDEMPOTENCY_CACHE_SIZE: "INVALID_IDEMPOTENCY_CACHE_SIZE",
    INVALID_IDEMPOTENCY_KEY: "INVALID_IDEMPOTENCY_KEY",
    INVALID_METHOD_NAME: "INVALID_METHOD_NAME",
    INVALID_RETRY_POLICY: "INVALID_RETRY_POLICY",
    METHOD_NOT_FOUND: "METHOD_NOT_FOUND",
    METHOD_NOT_REGISTERED: "METHOD_NOT_REGISTERED",
    RETRY_EXHAUSTED: "RETRY_EXHAUSTED",
    SERVER_ALREADY_STARTED: "SERVER_ALREADY_STARTED",
    SERVER_NOT_STARTED: "SERVER_NOT_STARTED",
} as const

/**
 * AST service gRPC server adapter error code literal.
 */
export type AstServiceGrpcServerErrorCode =
    (typeof AST_SERVICE_GRPC_SERVER_ERROR_CODE)[keyof typeof AST_SERVICE_GRPC_SERVER_ERROR_CODE]

/**
 * Structured metadata for AST service gRPC server adapter failures.
 */
export interface IAstServiceGrpcServerErrorDetails {
    /**
     * Method name when available.
     */
    readonly methodName?: string

    /**
     * Invalid idempotency key when available.
     */
    readonly idempotencyKey?: string

    /**
     * Attempts count when available.
     */
    readonly attempts?: number

    /**
     * Invalid numeric value when available.
     */
    readonly value?: number

    /**
     * Underlying error message when available.
     */
    readonly causeMessage?: string
}

/**
 * Typed AST service gRPC server adapter error with stable metadata.
 */
export class AstServiceGrpcServerError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstServiceGrpcServerErrorCode

    /**
     * Method name when available.
     */
    public readonly methodName?: string

    /**
     * Invalid idempotency key when available.
     */
    public readonly idempotencyKey?: string

    /**
     * Attempts count when available.
     */
    public readonly attempts?: number

    /**
     * Invalid numeric value when available.
     */
    public readonly value?: number

    /**
     * Underlying error message when available.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed AST service gRPC server adapter error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstServiceGrpcServerErrorCode,
        details: IAstServiceGrpcServerErrorDetails = {},
    ) {
        super(createAstServiceGrpcServerErrorMessage(code, details))

        this.name = "AstServiceGrpcServerError"
        this.code = code
        this.methodName = details.methodName
        this.idempotencyKey = details.idempotencyKey
        this.attempts = details.attempts
        this.value = details.value
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public message for AST service gRPC server adapter failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstServiceGrpcServerErrorMessage(
    code: AstServiceGrpcServerErrorCode,
    details: IAstServiceGrpcServerErrorDetails,
): string {
    return AST_SERVICE_GRPC_SERVER_ERROR_MESSAGES[code](details)
}

const AST_SERVICE_GRPC_SERVER_ERROR_MESSAGES: Readonly<
    Record<
        AstServiceGrpcServerErrorCode,
        (details: IAstServiceGrpcServerErrorDetails) => string
    >
> = {
    HANDLER_ALREADY_REGISTERED: (details) =>
        `Handler is already registered for ast grpc method: ${details.methodName ?? "<empty>"}`,
    HANDLER_FAILED: (details) =>
        `Ast grpc method handler failed for ${details.methodName ?? "<empty>"}: ${
            details.causeMessage ?? "<unknown>"
        }`,
    INVALID_IDEMPOTENCY_CACHE_SIZE: (details) =>
        `Invalid ast grpc idempotency cache size: ${details.value ?? Number.NaN}`,
    INVALID_IDEMPOTENCY_KEY: (details) =>
        `Invalid ast grpc idempotency key: ${details.idempotencyKey ?? "<empty>"}`,
    INVALID_METHOD_NAME: (details) =>
        `Invalid ast grpc method name: ${details.methodName ?? "<empty>"}`,
    INVALID_RETRY_POLICY: (details) =>
        `Invalid ast grpc retry policy value: ${details.value ?? Number.NaN}`,
    METHOD_NOT_FOUND: (details) =>
        `Ast grpc method was not found in protobuf definitions: ${details.methodName ?? "<empty>"}`,
    METHOD_NOT_REGISTERED: (details) =>
        `Ast grpc method handler is not registered: ${details.methodName ?? "<empty>"}`,
    RETRY_EXHAUSTED: (details) =>
        `Ast grpc retry exhausted for ${details.methodName ?? "<empty>"} after ${
            details.attempts ?? 0
        } attempts`,
    SERVER_ALREADY_STARTED: () => "Ast grpc server is already started",
    SERVER_NOT_STARTED: () => "Ast grpc server is not started",
}
