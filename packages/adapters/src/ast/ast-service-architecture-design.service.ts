import {
    AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE,
    AstServiceArchitectureDesignError,
} from "./ast-service-architecture-design.error"

const DEFAULT_SERVICE_NAME = "ast-service"
const DEFAULT_GRPC_PORT = 50051
const DEFAULT_MIN_REPLICAS = 2
const DEFAULT_MAX_REPLICAS = 12
const DEFAULT_WORKER_POOL_SIZE = 24
const DEFAULT_INGEST_BATCH_SIZE = 64
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000
const DEFAULT_IDEMPOTENCY_TTL_MS = 86_400_000
const DEFAULT_RETRY_MAX_ATTEMPTS = 5
const DEFAULT_RETRY_INITIAL_BACKOFF_MS = 250
const DEFAULT_RETRY_MAX_BACKOFF_MS = 5_000

const DEFAULT_QUEUE_NAMES = {
    ingest: "ast.ingest",
    parse: "ast.parse",
    graph: "ast.graph",
    metrics: "ast.metrics",
    deadLetter: "ast.dlq",
} as const

const COMPONENT_KIND = {
    API_GATEWAY: "api-gateway",
    GRPC_SERVICE: "grpc-service",
    JOB_ORCHESTRATOR: "job-orchestrator",
    WORKER_POOL: "worker-pool",
    IDEMPOTENCY_STORE: "idempotency-store",
    QUEUE_SYSTEM: "queue-system",
    PARSED_AST_CACHE: "parsed-ast-cache",
    GRAPH_STORE: "graph-store",
    METRICS_PIPELINE: "metrics-pipeline",
} as const

/**
 * AST service component kind literal.
 */
export type AstServiceArchitectureComponentKind =
    (typeof COMPONENT_KIND)[keyof typeof COMPONENT_KIND]

/**
 * Queue names input for AST service architecture design.
 */
export interface IAstServiceArchitectureQueueNamesInput {
    /**
     * Queue for initial scan and parse ingestion jobs.
     */
    readonly ingest?: string

    /**
     * Queue for syntax-tree extraction and normalization jobs.
     */
    readonly parse?: string

    /**
     * Queue for graph enrichment and persistence jobs.
     */
    readonly graph?: string

    /**
     * Queue for metrics, embeddings, and downstream analytics jobs.
     */
    readonly metrics?: string

    /**
     * Dead-letter queue for exhausted retries.
     */
    readonly deadLetter?: string
}

/**
 * Retry policy input for AST service architecture design.
 */
export interface IAstServiceArchitectureRetryPolicyInput {
    /**
     * Maximum number of attempts including the first execution.
     */
    readonly maxAttempts?: number

    /**
     * Initial exponential retry backoff in milliseconds.
     */
    readonly initialBackoffMs?: number

    /**
     * Maximum capped retry backoff in milliseconds.
     */
    readonly maxBackoffMs?: number
}

/**
 * Input payload for AST service architecture design.
 */
export interface IAstServiceArchitectureDesignInput {
    /**
     * Public service name for deployment and observability labels.
     */
    readonly serviceName?: string

    /**
     * gRPC ingress port exposed by service gateway.
     */
    readonly grpcPort?: number

    /**
     * Minimum number of running replicas.
     */
    readonly minReplicas?: number

    /**
     * Maximum number of autoscaled replicas.
     */
    readonly maxReplicas?: number

    /**
     * Number of concurrent worker slots per replica.
     */
    readonly workerPoolSize?: number

    /**
     * Maximum files per ingestion job.
     */
    readonly ingestBatchSize?: number

    /**
     * Request timeout budget in milliseconds.
     */
    readonly requestTimeoutMs?: number

    /**
     * Idempotency key time-to-live in milliseconds.
     */
    readonly idempotencyTtlMs?: number

    /**
     * Retry/backoff behavior for queue jobs.
     */
    readonly retryPolicy?: IAstServiceArchitectureRetryPolicyInput

    /**
     * Optional queue name overrides.
     */
    readonly queueNames?: IAstServiceArchitectureQueueNamesInput
}

/**
 * Resolved retry policy for AST service architecture.
 */
export interface IAstServiceArchitectureRetryPolicy {
    /**
     * Maximum number of attempts including the first execution.
     */
    readonly maxAttempts: number

    /**
     * Initial exponential retry backoff in milliseconds.
     */
    readonly initialBackoffMs: number

    /**
     * Maximum capped retry backoff in milliseconds.
     */
    readonly maxBackoffMs: number
}

/**
 * Resolved queue names for AST service architecture.
 */
export interface IAstServiceArchitectureQueueNames {
    /**
     * Queue for initial scan and parse ingestion jobs.
     */
    readonly ingest: string

    /**
     * Queue for syntax-tree extraction and normalization jobs.
     */
    readonly parse: string

    /**
     * Queue for graph enrichment and persistence jobs.
     */
    readonly graph: string

    /**
     * Queue for metrics, embeddings, and downstream analytics jobs.
     */
    readonly metrics: string

    /**
     * Dead-letter queue for exhausted retries.
     */
    readonly deadLetter: string
}

/**
 * One architecture component node in resulting blueprint.
 */
export interface IAstServiceArchitectureComponent {
    /**
     * Stable component identifier.
     */
    readonly id: string

    /**
     * Component kind.
     */
    readonly kind: AstServiceArchitectureComponentKind

    /**
     * Human-readable component responsibility.
     */
    readonly responsibility: string

    /**
     * Stable identifiers of upstream dependencies.
     */
    readonly dependsOn: readonly string[]
}

/**
 * One architecture flow edge in resulting blueprint.
 */
export interface IAstServiceArchitectureFlow {
    /**
     * Source component identifier.
     */
    readonly source: string

    /**
     * Target component identifier.
     */
    readonly target: string

    /**
     * Queue or transport channel name.
     */
    readonly channel: string
}

/**
 * Resulting AST service architecture summary.
 */
export interface IAstServiceArchitectureSummary {
    /**
     * Number of architecture components in blueprint.
     */
    readonly componentCount: number

    /**
     * Number of architecture data-flow edges in blueprint.
     */
    readonly flowCount: number

    /**
     * Maximum parallel processing capacity.
     */
    readonly maxParallelWorkers: number
}

/**
 * Resulting AST service architecture design payload.
 */
export interface IAstServiceArchitectureDesignResult {
    /**
     * Public service name for deployment and observability labels.
     */
    readonly serviceName: string

    /**
     * gRPC ingress transport configuration.
     */
    readonly grpc: {
        readonly port: number
        readonly requestTimeoutMs: number
    }

    /**
     * Horizontal scaling configuration.
     */
    readonly scaling: {
        readonly minReplicas: number
        readonly maxReplicas: number
        readonly workerPoolSize: number
    }

    /**
     * Runtime job processing policies.
     */
    readonly runtimePolicies: {
        readonly ingestBatchSize: number
        readonly idempotencyTtlMs: number
        readonly retryPolicy: IAstServiceArchitectureRetryPolicy
    }

    /**
     * Queue topology used by AST service.
     */
    readonly queueNames: IAstServiceArchitectureQueueNames

    /**
     * High-level architecture components.
     */
    readonly components: readonly IAstServiceArchitectureComponent[]

    /**
     * High-level architecture data flow.
     */
    readonly flow: readonly IAstServiceArchitectureFlow[]

    /**
     * Aggregated architecture summary.
     */
    readonly summary: IAstServiceArchitectureSummary
}

/**
 * AST service architecture design service contract.
 */
export interface IAstServiceArchitectureDesignService {
    /**
     * Designs scalable AST service architecture blueprint.
     *
     * @param input Optional design overrides.
     * @returns Deterministic architecture blueprint.
     */
    design(
        input?: IAstServiceArchitectureDesignInput,
    ): Promise<IAstServiceArchitectureDesignResult>
}

interface IResolvedAstServiceArchitectureDesignInput {
    readonly serviceName: string
    readonly grpcPort: number
    readonly minReplicas: number
    readonly maxReplicas: number
    readonly workerPoolSize: number
    readonly ingestBatchSize: number
    readonly requestTimeoutMs: number
    readonly idempotencyTtlMs: number
    readonly retryPolicy: IAstServiceArchitectureRetryPolicy
    readonly queueNames: IAstServiceArchitectureQueueNames
}

/**
 * Designs deterministic scalable AST service architecture.
 */
export class AstServiceArchitectureDesignService implements IAstServiceArchitectureDesignService {
    /**
     * Designs scalable AST service architecture blueprint.
     *
     * @param input Optional design overrides.
     * @returns Deterministic architecture blueprint.
     */
    public design(
        input: IAstServiceArchitectureDesignInput = {},
    ): Promise<IAstServiceArchitectureDesignResult> {
        const resolvedInput = resolveInput(input)
        const components = createComponents()
        const flow = createFlow(resolvedInput.queueNames)

        return Promise.resolve({
            serviceName: resolvedInput.serviceName,
            grpc: {
                port: resolvedInput.grpcPort,
                requestTimeoutMs: resolvedInput.requestTimeoutMs,
            },
            scaling: {
                minReplicas: resolvedInput.minReplicas,
                maxReplicas: resolvedInput.maxReplicas,
                workerPoolSize: resolvedInput.workerPoolSize,
            },
            runtimePolicies: {
                ingestBatchSize: resolvedInput.ingestBatchSize,
                idempotencyTtlMs: resolvedInput.idempotencyTtlMs,
                retryPolicy: resolvedInput.retryPolicy,
            },
            queueNames: resolvedInput.queueNames,
            components,
            flow,
            summary: createSummary(
                components.length,
                flow.length,
                resolvedInput.maxReplicas * resolvedInput.workerPoolSize,
            ),
        })
    }
}

/**
 * Resolves and validates design input.
 *
 * @param input Optional design overrides.
 * @returns Resolved validated design input.
 */
function resolveInput(
    input: IAstServiceArchitectureDesignInput,
): IResolvedAstServiceArchitectureDesignInput {
    const serviceName = normalizeServiceName(input.serviceName ?? DEFAULT_SERVICE_NAME)
    const grpcPort = validatePositiveInteger(
        input.grpcPort ?? DEFAULT_GRPC_PORT,
        AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_GRPC_PORT,
    )
    const minReplicas = validatePositiveInteger(
        input.minReplicas ?? DEFAULT_MIN_REPLICAS,
        AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_MIN_REPLICAS,
    )
    const maxReplicas = validatePositiveInteger(
        input.maxReplicas ?? DEFAULT_MAX_REPLICAS,
        AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_MAX_REPLICAS,
    )
    validateReplicaRange(minReplicas, maxReplicas)

    return {
        serviceName,
        grpcPort,
        minReplicas,
        maxReplicas,
        workerPoolSize: validatePositiveInteger(
            input.workerPoolSize ?? DEFAULT_WORKER_POOL_SIZE,
            AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_WORKER_POOL_SIZE,
        ),
        ingestBatchSize: validatePositiveInteger(
            input.ingestBatchSize ?? DEFAULT_INGEST_BATCH_SIZE,
            AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_INGEST_BATCH_SIZE,
        ),
        requestTimeoutMs: validatePositiveInteger(
            input.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
            AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_REQUEST_TIMEOUT_MS,
        ),
        idempotencyTtlMs: validatePositiveInteger(
            input.idempotencyTtlMs ?? DEFAULT_IDEMPOTENCY_TTL_MS,
            AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_IDEMPOTENCY_TTL_MS,
        ),
        retryPolicy: resolveRetryPolicy(input.retryPolicy),
        queueNames: resolveQueueNames(input.queueNames),
    }
}

/**
 * Normalizes and validates service name.
 *
 * @param serviceName Raw service name.
 * @returns Normalized service name.
 */
function normalizeServiceName(serviceName: string): string {
    const normalizedServiceName = serviceName.trim()
    if (normalizedServiceName.length === 0) {
        throw new AstServiceArchitectureDesignError(
            AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_SERVICE_NAME,
            {serviceName},
        )
    }

    return normalizedServiceName
}

/**
 * Validates positive integer value.
 *
 * @param value Raw numeric value.
 * @param errorCode Typed error code.
 * @returns Validated numeric value.
 */
function validatePositiveInteger(
    value: number,
    errorCode:
        (typeof AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE)[keyof typeof AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE],
): number {
    if (Number.isSafeInteger(value) && value > 0) {
        return value
    }

    throw new AstServiceArchitectureDesignError(errorCode, {value})
}

/**
 * Validates replica lower and upper bounds.
 *
 * @param minReplicas Min replicas.
 * @param maxReplicas Max replicas.
 */
function validateReplicaRange(minReplicas: number, maxReplicas: number): void {
    if (maxReplicas >= minReplicas) {
        return
    }

    throw new AstServiceArchitectureDesignError(
        AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_REPLICA_RANGE,
        {
            minReplicas,
            maxReplicas,
        },
    )
}

/**
 * Resolves and validates retry policy.
 *
 * @param input Optional retry policy overrides.
 * @returns Resolved retry policy.
 */
function resolveRetryPolicy(
    input: IAstServiceArchitectureRetryPolicyInput | undefined,
): IAstServiceArchitectureRetryPolicy {
    const maxAttempts = validatePositiveInteger(
        input?.maxAttempts ?? DEFAULT_RETRY_MAX_ATTEMPTS,
        AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_RETRY_MAX_ATTEMPTS,
    )
    const initialBackoffMs = validatePositiveInteger(
        input?.initialBackoffMs ?? DEFAULT_RETRY_INITIAL_BACKOFF_MS,
        AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_RETRY_INITIAL_BACKOFF_MS,
    )
    const maxBackoffMs = validatePositiveInteger(
        input?.maxBackoffMs ?? DEFAULT_RETRY_MAX_BACKOFF_MS,
        AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_RETRY_MAX_BACKOFF_MS,
    )

    if (maxBackoffMs < initialBackoffMs) {
        throw new AstServiceArchitectureDesignError(
            AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_RETRY_MAX_BACKOFF_MS,
            {
                value: maxBackoffMs,
            },
        )
    }

    return {
        maxAttempts,
        initialBackoffMs,
        maxBackoffMs,
    }
}

/**
 * Resolves and validates queue names.
 *
 * @param input Optional queue name overrides.
 * @returns Resolved queue names.
 */
function resolveQueueNames(
    input: IAstServiceArchitectureQueueNamesInput | undefined,
): IAstServiceArchitectureQueueNames {
    const queueInput = resolveQueueInput(input)

    return {
        ingest: resolveQueueName(queueInput.ingest, DEFAULT_QUEUE_NAMES.ingest),
        parse: resolveQueueName(queueInput.parse, DEFAULT_QUEUE_NAMES.parse),
        graph: resolveQueueName(queueInput.graph, DEFAULT_QUEUE_NAMES.graph),
        metrics: resolveQueueName(queueInput.metrics, DEFAULT_QUEUE_NAMES.metrics),
        deadLetter: resolveQueueName(queueInput.deadLetter, DEFAULT_QUEUE_NAMES.deadLetter),
    }
}

/**
 * Resolves optional queue input object.
 *
 * @param input Optional queue names input.
 * @returns Queue names input object.
 */
function resolveQueueInput(
    input: IAstServiceArchitectureQueueNamesInput | undefined,
): IAstServiceArchitectureQueueNamesInput {
    if (input !== undefined) {
        return input
    }

    return {}
}

/**
 * Resolves one queue name with fallback and validation.
 *
 * @param queueName Optional queue name override.
 * @param fallbackQueueName Default queue name.
 * @returns Resolved normalized queue name.
 */
function resolveQueueName(queueName: string | undefined, fallbackQueueName: string): string {
    return normalizeQueueName(queueName ?? fallbackQueueName)
}

/**
 * Normalizes and validates one queue name.
 *
 * @param queueName Raw queue name.
 * @returns Normalized queue name.
 */
function normalizeQueueName(queueName: string): string {
    const normalizedQueueName = queueName.trim()
    const queueNamePattern = /^[a-z][a-z0-9.-]*$/

    if (queueNamePattern.test(normalizedQueueName)) {
        return normalizedQueueName
    }

    throw new AstServiceArchitectureDesignError(
        AST_SERVICE_ARCHITECTURE_DESIGN_ERROR_CODE.INVALID_QUEUE_NAME,
        {
            queueName,
        },
    )
}

/**
 * Creates deterministic architecture components.
 *
 * @returns Deterministic component list.
 */
function createComponents(): readonly IAstServiceArchitectureComponent[] {
    return [
        {
            id: "api-gateway",
            kind: COMPONENT_KIND.API_GATEWAY,
            responsibility: "Exposes gRPC ingress and validates authentication and payload contracts",
            dependsOn: ["grpc-service"],
        },
        {
            id: "grpc-service",
            kind: COMPONENT_KIND.GRPC_SERVICE,
            responsibility: "Routes RPC requests into ingest and orchestration queues",
            dependsOn: ["job-orchestrator", "queue-system"],
        },
        {
            id: "job-orchestrator",
            kind: COMPONENT_KIND.JOB_ORCHESTRATOR,
            responsibility: "Plans parse, graph, and metrics stages for repository scan requests",
            dependsOn: ["idempotency-store", "queue-system"],
        },
        {
            id: "worker-pool",
            kind: COMPONENT_KIND.WORKER_POOL,
            responsibility: "Executes parse, graph, and metrics jobs with bounded concurrency",
            dependsOn: ["queue-system", "parsed-ast-cache", "graph-store"],
        },
        {
            id: "idempotency-store",
            kind: COMPONENT_KIND.IDEMPOTENCY_STORE,
            responsibility: "Stores request keys and completed stages to prevent duplicate execution",
            dependsOn: [],
        },
        {
            id: "queue-system",
            kind: COMPONENT_KIND.QUEUE_SYSTEM,
            responsibility: "Provides durable queues, retries, and dead-letter routing for jobs",
            dependsOn: [],
        },
        {
            id: "parsed-ast-cache",
            kind: COMPONENT_KIND.PARSED_AST_CACHE,
            responsibility: "Caches parsed trees and intermediate chunks for repeated scans",
            dependsOn: [],
        },
        {
            id: "graph-store",
            kind: COMPONENT_KIND.GRAPH_STORE,
            responsibility: "Persists code graph snapshots and derived relations per repository scope",
            dependsOn: [],
        },
        {
            id: "metrics-pipeline",
            kind: COMPONENT_KIND.METRICS_PIPELINE,
            responsibility: "Computes file metrics, embeddings, and health counters from AST outputs",
            dependsOn: ["queue-system", "parsed-ast-cache", "graph-store"],
        },
    ]
}

/**
 * Creates deterministic architecture flow edges.
 *
 * @param queueNames Resolved queue names.
 * @returns Deterministic flow list.
 */
function createFlow(
    queueNames: IAstServiceArchitectureQueueNames,
): readonly IAstServiceArchitectureFlow[] {
    return [
        {
            source: "api-gateway",
            target: "grpc-service",
            channel: "grpc",
        },
        {
            source: "grpc-service",
            target: "job-orchestrator",
            channel: queueNames.ingest,
        },
        {
            source: "job-orchestrator",
            target: "worker-pool",
            channel: queueNames.parse,
        },
        {
            source: "worker-pool",
            target: "graph-store",
            channel: queueNames.graph,
        },
        {
            source: "worker-pool",
            target: "metrics-pipeline",
            channel: queueNames.metrics,
        },
        {
            source: "queue-system",
            target: "worker-pool",
            channel: queueNames.deadLetter,
        },
    ]
}

/**
 * Creates deterministic architecture summary.
 *
 * @param componentCount Number of components.
 * @param flowCount Number of flow edges.
 * @param maxParallelWorkers Maximum parallel workers.
 * @returns Deterministic summary.
 */
function createSummary(
    componentCount: number,
    flowCount: number,
    maxParallelWorkers: number,
): IAstServiceArchitectureSummary {
    return {
        componentCount,
        flowCount,
        maxParallelWorkers,
    }
}
