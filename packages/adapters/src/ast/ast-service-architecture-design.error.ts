/**
 * Typed error codes for AST service architecture design.
 */
export const AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE = {
    INVALID_GRPC_PORT: "INVALID_GRPC_PORT",
    INVALID_IDEMPOTENCY_TTL_MS: "INVALID_IDEMPOTENCY_TTL_MS",
    INVALID_INGEST_BATCH_SIZE: "INVALID_INGEST_BATCH_SIZE",
    INVALID_MAX_REPLICAS: "INVALID_MAX_REPLICAS",
    INVALID_MIN_REPLICAS: "INVALID_MIN_REPLICAS",
    INVALID_QUEUE_NAME: "INVALID_QUEUE_NAME",
    INVALID_REPLICA_RANGE: "INVALID_REPLICA_RANGE",
    INVALID_REQUEST_TIMEOUT_MS: "INVALID_REQUEST_TIMEOUT_MS",
    INVALID_RETRY_INITIAL_BACKOFF_MS: "INVALID_RETRY_INITIAL_BACKOFF_MS",
    INVALID_RETRY_MAX_ATTEMPTS: "INVALID_RETRY_MAX_ATTEMPTS",
    INVALID_RETRY_MAX_BACKOFF_MS: "INVALID_RETRY_MAX_BACKOFF_MS",
    INVALID_SERVICE_NAME: "INVALID_SERVICE_NAME",
    INVALID_WORKER_POOL_SIZE: "INVALID_WORKER_POOL_SIZE",
} as const

/**
 * AST service architecture design error code literal.
 */
export type AstServiceArchitectureDesignErrorCode =
    (typeof AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE)[keyof typeof AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE]

/**
 * Structured metadata for AST service architecture design failures.
 */
export interface IAstServiceArchitectureDesignErrorDetails {
    /**
     * Invalid service name when available.
     */
    readonly serviceName?: string

    /**
     * Invalid queue name when available.
     */
    readonly queueName?: string

    /**
     * Invalid numeric value when available.
     */
    readonly value?: number

    /**
     * Current minimum replicas value when available.
     */
    readonly minReplicas?: number

    /**
     * Current maximum replicas value when available.
     */
    readonly maxReplicas?: number
}

/**
 * Typed AST service architecture design error with stable metadata.
 */
export class AstServiceArchitectureDesignError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstServiceArchitectureDesignErrorCode

    /**
     * Invalid service name when available.
     */
    public readonly serviceName?: string

    /**
     * Invalid queue name when available.
     */
    public readonly queueName?: string

    /**
     * Invalid numeric value when available.
     */
    public readonly value?: number

    /**
     * Current minimum replicas value when available.
     */
    public readonly minReplicas?: number

    /**
     * Current maximum replicas value when available.
     */
    public readonly maxReplicas?: number

    /**
     * Creates typed AST service architecture design error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstServiceArchitectureDesignErrorCode,
        details: IAstServiceArchitectureDesignErrorDetails = {},
    ) {
        super(createAstServiceArchitectureDesignErrorMessage(code, details))

        this.name = "AstServiceArchitectureDesignError"
        this.code = code
        this.serviceName = details.serviceName
        this.queueName = details.queueName
        this.value = details.value
        this.minReplicas = details.minReplicas
        this.maxReplicas = details.maxReplicas
    }
}

/**
 * Builds stable public message for AST service architecture design failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstServiceArchitectureDesignErrorMessage(
    code: AstServiceArchitectureDesignErrorCode,
    details: IAstServiceArchitectureDesignErrorDetails,
): string {
    return AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_MESSAGES[code](details)
}

const AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_MESSAGES: Readonly<
    Record<
        AstServiceArchitectureDesignErrorCode,
        (details: IAstServiceArchitectureDesignErrorDetails) => string
    >
> = {
    INVALID_GRPC_PORT: (details) =>
        `Invalid grpc port for ast service architecture design: ${details.value ?? Number.NaN}`,
    INVALID_IDEMPOTENCY_TTL_MS: (details) =>
        `Invalid idempotency ttl ms for ast service architecture design: ${
            details.value ?? Number.NaN
        }`,
    INVALID_INGEST_BATCH_SIZE: (details) =>
        `Invalid ingest batch size for ast service architecture design: ${
            details.value ?? Number.NaN
        }`,
    INVALID_MAX_REPLICAS: (details) =>
        `Invalid max replicas for ast service architecture design: ${details.value ?? Number.NaN}`,
    INVALID_MIN_REPLICAS: (details) =>
        `Invalid min replicas for ast service architecture design: ${details.value ?? Number.NaN}`,
    INVALID_QUEUE_NAME: (details) =>
        `Invalid queue name for ast service architecture design: ${details.queueName ?? "<empty>"}`,
    INVALID_REPLICA_RANGE: (details) =>
        `Invalid replica range for ast service architecture design: min=${
            details.minReplicas ?? Number.NaN
        }, max=${details.maxReplicas ?? Number.NaN}`,
    INVALID_REQUEST_TIMEOUT_MS: (details) =>
        `Invalid request timeout ms for ast service architecture design: ${
            details.value ?? Number.NaN
        }`,
    INVALID_RETRY_INITIAL_BACKOFF_MS: (details) =>
        `Invalid retry initial backoff ms for ast service architecture design: ${
            details.value ?? Number.NaN
        }`,
    INVALID_RETRY_MAX_ATTEMPTS: (details) =>
        `Invalid retry max attempts for ast service architecture design: ${
            details.value ?? Number.NaN
        }`,
    INVALID_RETRY_MAX_BACKOFF_MS: (details) =>
        `Invalid retry max backoff ms for ast service architecture design: ${
            details.value ?? Number.NaN
        }`,
    INVALID_SERVICE_NAME: (details) =>
        `Invalid service name for ast service architecture design: ${
            details.serviceName ?? "<empty>"
        }`,
    INVALID_WORKER_POOL_SIZE: (details) =>
        `Invalid worker pool size for ast service architecture design: ${
            details.value ?? Number.NaN
        }`,
}
