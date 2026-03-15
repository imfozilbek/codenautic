import {
    AstServiceProtobufDefinitionsService,
    type IAstServiceGrpcMethodDefinition,
    type IAstServiceProtobufDefinitions,
    type IAstServiceProtobufDefinitionsService,
} from "./ast-service-protobuf-definitions.service"
import {
    AST_SERVICE_GRPC_SERVER_ERROR_CODE,
    AstServiceGrpcServerError,
} from "./ast-service-grpc-server.error"

const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_INITIAL_BACKOFF_MS = 250
const DEFAULT_MAX_BACKOFF_MS = 5000
const DEFAULT_IDEMPOTENCY_CACHE_SIZE = 1000

/**
 * Sleep function used by retry/backoff handling.
 */
export type AstServiceGrpcServerSleep = (durationMs: number) => Promise<void>

/**
 * Clock function used by invoke metrics.
 */
export type AstServiceGrpcServerNow = () => number

/**
 * Retry classifier callback for handler failures.
 */
export type AstServiceGrpcServerShouldRetry = (error: unknown, attempt: number) => boolean

/**
 * Retry policy input for gRPC invocation.
 */
export interface IAstServiceGrpcServerRetryPolicyInput {
    /**
     * Maximum attempts including initial execution.
     */
    readonly maxAttempts?: number

    /**
     * Initial exponential backoff in milliseconds.
     */
    readonly initialBackoffMs?: number

    /**
     * Maximum capped backoff in milliseconds.
     */
    readonly maxBackoffMs?: number
}

/**
 * Invocation input payload for one gRPC method call.
 */
export interface IAstServiceGrpcServerInvokeInput<TRequest = unknown> {
    /**
     * gRPC method name.
     */
    readonly methodName: string

    /**
     * Request payload.
     */
    readonly request: TRequest

    /**
     * Optional idempotency key for response deduplication.
     */
    readonly idempotencyKey?: string

    /**
     * Optional runtime retry policy overrides.
     */
    readonly retryPolicy?: IAstServiceGrpcServerRetryPolicyInput
}

/**
 * Invocation result payload for one gRPC method call.
 */
export interface IAstServiceGrpcServerInvokeResult<TResponse = unknown> {
    /**
     * Method response payload.
     */
    readonly response: TResponse

    /**
     * Number of executed attempts.
     */
    readonly attempts: number

    /**
     * Whether response was served from idempotency cache.
     */
    readonly fromIdempotencyCache: boolean

    /**
     * Invocation duration in milliseconds.
     */
    readonly durationMs: number
}

/**
 * Registered gRPC method handler callback.
 */
export type AstServiceGrpcServerMethodHandler<TRequest = unknown, TResponse = unknown> = (
    request: TRequest,
) => Promise<TResponse>

/**
 * Runtime options for AST service gRPC server adapter.
 */
export interface IAstServiceGrpcServerOptions {
    /**
     * Optional protobuf definitions provider.
     */
    readonly definitionsService?: IAstServiceProtobufDefinitionsService

    /**
     * Optional bounded idempotency cache size.
     */
    readonly idempotencyCacheSize?: number

    /**
     * Optional sleep override for retry/backoff behavior.
     */
    readonly sleep?: AstServiceGrpcServerSleep

    /**
     * Optional clock override for duration metrics.
     */
    readonly now?: AstServiceGrpcServerNow

    /**
     * Optional retry classifier callback.
     */
    readonly shouldRetry?: AstServiceGrpcServerShouldRetry
}

/**
 * AST service gRPC server adapter contract.
 */
export interface IAstServiceGrpcServer {
    /**
     * Starts gRPC server lifecycle.
     */
    start(): Promise<void>

    /**
     * Stops gRPC server lifecycle.
     */
    stop(): Promise<void>

    /**
     * Registers one method handler.
     *
     * @param methodName gRPC method name.
     * @param handler Method handler callback.
     */
    registerMethod<TRequest, TResponse>(
        methodName: string,
        handler: AstServiceGrpcServerMethodHandler<TRequest, TResponse>,
    ): void

    /**
     * Invokes one registered gRPC method handler.
     *
     * @param input Invocation payload.
     * @returns Invocation result payload.
     */
    invoke<TRequest, TResponse>(
        input: IAstServiceGrpcServerInvokeInput<TRequest>,
    ): Promise<IAstServiceGrpcServerInvokeResult<TResponse>>
}

interface IResolvedRetryPolicy {
    readonly maxAttempts: number
    readonly initialBackoffMs: number
    readonly maxBackoffMs: number
}

interface IExecutionResult {
    readonly response: unknown
    readonly attempts: number
}

/**
 * In-memory gRPC server adapter for AST service handlers.
 */
export class AstServiceGrpcServer implements IAstServiceGrpcServer {
    private readonly definitionsService: IAstServiceProtobufDefinitionsService
    private readonly idempotencyCacheSize: number
    private readonly sleep: AstServiceGrpcServerSleep
    private readonly now: AstServiceGrpcServerNow
    private readonly shouldRetry: AstServiceGrpcServerShouldRetry
    private readonly handlers = new Map<string, AstServiceGrpcServerMethodHandler<unknown, unknown>>()
    private readonly idempotencyCache = new Map<string, unknown>()
    private definitionsPromise: Promise<IAstServiceProtobufDefinitions> | undefined
    private started = false

    /**
     * Creates AST service gRPC server adapter.
     *
     * @param options Optional runtime overrides.
     */
    public constructor(options: IAstServiceGrpcServerOptions = {}) {
        this.definitionsService = options.definitionsService ?? new AstServiceProtobufDefinitionsService()
        this.idempotencyCacheSize = validateIdempotencyCacheSize(
            options.idempotencyCacheSize ?? DEFAULT_IDEMPOTENCY_CACHE_SIZE,
        )
        this.sleep = options.sleep ?? sleepFor
        this.now = options.now ?? Date.now
        this.shouldRetry = options.shouldRetry ?? defaultShouldRetry
    }

    /**
     * Starts gRPC server lifecycle.
     */
    public async start(): Promise<void> {
        if (this.started) {
            throw new AstServiceGrpcServerError(
                AST_SERVICE_GRPC_SERVER_ERROR_CODE.SERVER_ALREADY_STARTED,
            )
        }

        await this.getDefinitions()
        this.started = true
    }

    /**
     * Stops gRPC server lifecycle.
     */
    public stop(): Promise<void> {
        if (this.started === false) {
            throw new AstServiceGrpcServerError(
                AST_SERVICE_GRPC_SERVER_ERROR_CODE.SERVER_NOT_STARTED,
            )
        }

        this.started = false
        return Promise.resolve()
    }

    /**
     * Registers one method handler.
     *
     * @param methodName gRPC method name.
     * @param handler Method handler callback.
     */
    public registerMethod<TRequest, TResponse>(
        methodName: string,
        handler: AstServiceGrpcServerMethodHandler<TRequest, TResponse>,
    ): void {
        const normalizedMethodName = normalizeMethodName(methodName)
        if (this.handlers.has(normalizedMethodName)) {
            throw new AstServiceGrpcServerError(
                AST_SERVICE_GRPC_SERVER_ERROR_CODE.HANDLER_ALREADY_REGISTERED,
                {methodName: normalizedMethodName},
            )
        }

        this.handlers.set(normalizedMethodName, handler as AstServiceGrpcServerMethodHandler<unknown, unknown>)
    }

    /**
     * Invokes one registered gRPC method handler.
     *
     * @param input Invocation payload.
     * @returns Invocation result payload.
     */
    public async invoke<TRequest, TResponse>(
        input: IAstServiceGrpcServerInvokeInput<TRequest>,
    ): Promise<IAstServiceGrpcServerInvokeResult<TResponse>> {
        ensureServerStarted(this.started)

        const methodName = normalizeMethodName(input.methodName)
        const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey)
        const cacheKey = resolveCacheKey(methodName, idempotencyKey)
        const startedAt = this.now()
        const cachedResponse = this.resolveCachedResponse(cacheKey)
        if (cachedResponse !== undefined) {
            return {
                response: cachedResponse as TResponse,
                attempts: 1,
                fromIdempotencyCache: true,
                durationMs: this.now() - startedAt,
            }
        }

        const definitions = await this.getDefinitions()
        const methodDefinition = resolveMethodDefinition(definitions.methods, methodName)
        const handler = resolveHandler(this.handlers, methodName)
        const execution = await this.executeWithRetry(
            methodDefinition,
            handler,
            input.request,
            input.retryPolicy,
        )

        this.persistCachedResponse(cacheKey, execution.response)
        return {
            response: execution.response as TResponse,
            attempts: execution.attempts,
            fromIdempotencyCache: false,
            durationMs: this.now() - startedAt,
        }
    }

    /**
     * Executes handler with retry policy.
     *
     * @param methodDefinition gRPC method definition.
     * @param handler Registered method handler.
     * @param request Request payload.
     * @param retryPolicyInput Optional retry policy.
     * @returns Execution result payload.
     */
    private async executeWithRetry(
        methodDefinition: IAstServiceGrpcMethodDefinition,
        handler: AstServiceGrpcServerMethodHandler<unknown, unknown>,
        request: unknown,
        retryPolicyInput: IAstServiceGrpcServerRetryPolicyInput | undefined,
    ): Promise<IExecutionResult> {
        const retryPolicy = resolveRetryPolicy(methodDefinition, retryPolicyInput)
        let attempt = 0

        while (attempt < retryPolicy.maxAttempts) {
            attempt += 1

            try {
                const response = await handler(request)
                return {
                    response,
                    attempts: attempt,
                }
            } catch (error) {
                const retryableError = this.shouldRetry(error, attempt)
                const hasRemainingAttempts = attempt < retryPolicy.maxAttempts
                if (methodDefinition.retryable && retryableError && hasRemainingAttempts) {
                    const backoffMs = resolveBackoffMs(attempt, retryPolicy)
                    await this.sleep(backoffMs)
                    continue
                }

                if (methodDefinition.retryable && retryableError) {
                    throw new AstServiceGrpcServerError(
                        AST_SERVICE_GRPC_SERVER_ERROR_CODE.RETRY_EXHAUSTED,
                        {
                            methodName: methodDefinition.name,
                            attempts: retryPolicy.maxAttempts,
                        },
                    )
                }

                if (methodDefinition.retryable === false) {
                    throw createHandlerFailureError(methodDefinition.name, error)
                }

                throw createHandlerFailureError(methodDefinition.name, error)
            }
        }

        throw new AstServiceGrpcServerError(
            AST_SERVICE_GRPC_SERVER_ERROR_CODE.RETRY_EXHAUSTED,
            {
                methodName: methodDefinition.name,
                attempts: retryPolicy.maxAttempts,
            },
        )
    }

    /**
     * Resolves cached response by cache key.
     *
     * @param cacheKey Optional cache key.
     * @returns Cached response when available.
     */
    private resolveCachedResponse(cacheKey: string | undefined): unknown {
        if (cacheKey === undefined) {
            return undefined
        }

        return this.idempotencyCache.get(cacheKey)
    }

    /**
     * Persists cached response with bounded eviction.
     *
     * @param cacheKey Optional cache key.
     * @param response Handler response payload.
     */
    private persistCachedResponse(cacheKey: string | undefined, response: unknown): void {
        if (cacheKey === undefined) {
            return
        }

        if (this.idempotencyCache.has(cacheKey)) {
            return
        }

        if (this.idempotencyCache.size >= this.idempotencyCacheSize) {
            const oldestKey = this.idempotencyCache.keys().next().value
            if (oldestKey !== undefined) {
                this.idempotencyCache.delete(oldestKey)
            }
        }

        this.idempotencyCache.set(cacheKey, response)
    }

    /**
     * Returns cached protobuf definitions.
     *
     * @returns Protobuf definitions.
     */
    private getDefinitions(): Promise<IAstServiceProtobufDefinitions> {
        if (this.definitionsPromise === undefined) {
            this.definitionsPromise = this.definitionsService.getDefinitions()
        }

        return this.definitionsPromise
    }
}

/**
 * Validates bounded idempotency cache size.
 *
 * @param idempotencyCacheSize Raw cache size.
 * @returns Validated cache size.
 */
function validateIdempotencyCacheSize(idempotencyCacheSize: number): number {
    if (Number.isSafeInteger(idempotencyCacheSize) && idempotencyCacheSize > 0) {
        return idempotencyCacheSize
    }

    throw new AstServiceGrpcServerError(
        AST_SERVICE_GRPC_SERVER_ERROR_CODE.INVALID_IDEMPOTENCY_CACHE_SIZE,
        {value: idempotencyCacheSize},
    )
}

/**
 * Ensures server lifecycle is started before invocation.
 *
 * @param started Server started flag.
 */
function ensureServerStarted(started: boolean): void {
    if (started) {
        return
    }

    throw new AstServiceGrpcServerError(AST_SERVICE_GRPC_SERVER_ERROR_CODE.SERVER_NOT_STARTED)
}

/**
 * Normalizes and validates gRPC method name.
 *
 * @param methodName Raw method name.
 * @returns Normalized method name.
 */
function normalizeMethodName(methodName: string): string {
    const normalizedMethodName = methodName.trim()
    const methodPattern = /^[A-Z][A-Za-z0-9]*$/

    if (methodPattern.test(normalizedMethodName)) {
        return normalizedMethodName
    }

    throw new AstServiceGrpcServerError(
        AST_SERVICE_GRPC_SERVER_ERROR_CODE.INVALID_METHOD_NAME,
        {methodName},
    )
}

/**
 * Normalizes and validates idempotency key.
 *
 * @param idempotencyKey Raw idempotency key.
 * @returns Normalized idempotency key or undefined.
 */
function normalizeIdempotencyKey(idempotencyKey: string | undefined): string | undefined {
    if (idempotencyKey === undefined) {
        return undefined
    }

    const normalizedIdempotencyKey = idempotencyKey.trim()
    if (normalizedIdempotencyKey.length > 0) {
        return normalizedIdempotencyKey
    }

    throw new AstServiceGrpcServerError(
        AST_SERVICE_GRPC_SERVER_ERROR_CODE.INVALID_IDEMPOTENCY_KEY,
        {idempotencyKey},
    )
}

/**
 * Resolves idempotency cache key.
 *
 * @param methodName gRPC method name.
 * @param idempotencyKey Optional idempotency key.
 * @returns Cache key or undefined.
 */
function resolveCacheKey(methodName: string, idempotencyKey: string | undefined): string | undefined {
    if (idempotencyKey === undefined) {
        return undefined
    }

    return `${methodName}::${idempotencyKey}`
}

/**
 * Resolves one method definition by name.
 *
 * @param methods Available method definitions.
 * @param methodName Requested method name.
 * @returns Method definition.
 */
function resolveMethodDefinition(
    methods: readonly IAstServiceGrpcMethodDefinition[],
    methodName: string,
): IAstServiceGrpcMethodDefinition {
    const match = methods.find((method) => method.name === methodName)
    if (match !== undefined) {
        return match
    }

    throw new AstServiceGrpcServerError(AST_SERVICE_GRPC_SERVER_ERROR_CODE.METHOD_NOT_FOUND, {
        methodName,
    })
}

/**
 * Resolves registered handler by method name.
 *
 * @param handlers Registered handlers map.
 * @param methodName Requested method name.
 * @returns Registered handler.
 */
function resolveHandler(
    handlers: ReadonlyMap<string, AstServiceGrpcServerMethodHandler<unknown, unknown>>,
    methodName: string,
): AstServiceGrpcServerMethodHandler<unknown, unknown> {
    const handler = handlers.get(methodName)
    if (handler !== undefined) {
        return handler
    }

    throw new AstServiceGrpcServerError(
        AST_SERVICE_GRPC_SERVER_ERROR_CODE.METHOD_NOT_REGISTERED,
        {methodName},
    )
}

/**
 * Resolves runtime retry policy.
 *
 * @param methodDefinition gRPC method definition.
 * @param input Optional retry policy input.
 * @returns Resolved retry policy.
 */
function resolveRetryPolicy(
    methodDefinition: IAstServiceGrpcMethodDefinition,
    input: IAstServiceGrpcServerRetryPolicyInput | undefined,
): IResolvedRetryPolicy {
    if (methodDefinition.retryable === false) {
        return {
            maxAttempts: 1,
            initialBackoffMs: 0,
            maxBackoffMs: 0,
        }
    }

    const maxAttempts = validateRetryPolicyValue(
        input?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    )
    const initialBackoffMs = validateRetryPolicyValue(
        input?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS,
    )
    const maxBackoffMs = validateRetryPolicyValue(
        input?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS,
    )

    if (maxBackoffMs < initialBackoffMs) {
        throw new AstServiceGrpcServerError(
            AST_SERVICE_GRPC_SERVER_ERROR_CODE.INVALID_RETRY_POLICY,
            {value: maxBackoffMs},
        )
    }

    return {
        maxAttempts,
        initialBackoffMs,
        maxBackoffMs,
    }
}

/**
 * Validates one retry policy numeric value.
 *
 * @param value Raw numeric value.
 * @returns Validated value.
 */
function validateRetryPolicyValue(value: number): number {
    if (Number.isSafeInteger(value) && value > 0) {
        return value
    }

    throw new AstServiceGrpcServerError(
        AST_SERVICE_GRPC_SERVER_ERROR_CODE.INVALID_RETRY_POLICY,
        {value},
    )
}

/**
 * Resolves retry backoff for one attempt.
 *
 * @param attempt Current attempt.
 * @param retryPolicy Resolved retry policy.
 * @returns Backoff duration in milliseconds.
 */
function resolveBackoffMs(attempt: number, retryPolicy: IResolvedRetryPolicy): number {
    const exponent = Math.max(0, attempt - 1)
    const unboundedBackoff = retryPolicy.initialBackoffMs * 2 ** exponent
    return Math.min(retryPolicy.maxBackoffMs, unboundedBackoff)
}

/**
 * Creates typed handler failure error.
 *
 * @param methodName Method name.
 * @param error Handler error.
 * @returns Typed handler failure error.
 */
function createHandlerFailureError(methodName: string, error: unknown): AstServiceGrpcServerError {
    return new AstServiceGrpcServerError(
        AST_SERVICE_GRPC_SERVER_ERROR_CODE.HANDLER_FAILED,
        {
            methodName,
            causeMessage: error instanceof Error ? error.message : undefined,
        },
    )
}

/**
 * Default retry classifier.
 *
 * @param error Handler error.
 * @returns True when error is retryable.
 */
function defaultShouldRetry(error: unknown): boolean {
    if (isRetryableFlagValue(error, false)) {
        return false
    }

    return true
}

/**
 * Resolves boolean retryable flag from unknown error payload.
 *
 * @param value Unknown error value.
 * @param expected Expected boolean value.
 * @returns True when retryable flag equals expected value.
 */
function isRetryableFlagValue(value: unknown, expected: boolean): boolean {
    if (typeof value !== "object" || value === null) {
        return false
    }

    const retryable = (value as {readonly retryable?: unknown}).retryable
    return typeof retryable === "boolean" && retryable === expected
}

/**
 * Sleeps for provided duration.
 *
 * @param durationMs Backoff duration in milliseconds.
 * @returns Promise resolved after delay.
 */
function sleepFor(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, durationMs)
    })
}
