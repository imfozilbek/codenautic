import {FilePath} from "@codenautic/core"

import {
    AstServiceGrpcServer,
    type IAstServiceGrpcServer,
    type IAstServiceGrpcServerRetryPolicyInput,
} from "./ast-service-grpc-server.service"
import {
    AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE,
    AstServiceClientLibraryError,
} from "./ast-service-client-library.error"

/**
 * Client library options for AST service.
 */
export interface IAstServiceClientLibraryOptions {
    /**
     * Optional gRPC server transport adapter.
     */
    readonly server?: IAstServiceGrpcServer

    /**
     * Optional default retry policy.
     */
    readonly defaultRetryPolicy?: IAstServiceGrpcServerRetryPolicyInput
}

/**
 * Health check response payload.
 */
export interface IAstServiceHealthCheckResponse {
    /**
     * Service health status.
     */
    readonly status: string

    /**
     * Optional service version.
     */
    readonly version?: string

    /**
     * Optional server timestamp.
     */
    readonly timestampUnixMs?: number
}

/**
 * Start repository scan input payload.
 */
export interface IAstStartRepositoryScanInput {
    /**
     * Repository identifier.
     */
    readonly repositoryId: string

    /**
     * Commit sha snapshot.
     */
    readonly commitSha: string

    /**
     * Optional subset of file paths.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional idempotency key override.
     */
    readonly idempotencyKey?: string

    /**
     * Optional retry policy override.
     */
    readonly retryPolicy?: IAstServiceGrpcServerRetryPolicyInput
}

/**
 * Start repository scan response payload.
 */
export interface IAstStartRepositoryScanResult {
    /**
     * Scan request identifier.
     */
    readonly requestId: string

    /**
     * Initial scan state.
     */
    readonly state: string
}

/**
 * Repository scan status input payload.
 */
export interface IAstRepositoryScanStatusInput {
    /**
     * Scan request identifier.
     */
    readonly requestId: string

    /**
     * Optional retry policy override.
     */
    readonly retryPolicy?: IAstServiceGrpcServerRetryPolicyInput
}

/**
 * Repository scan status response payload.
 */
export interface IAstRepositoryScanStatusResult {
    /**
     * Scan request identifier.
     */
    readonly requestId: string

    /**
     * Current scan state.
     */
    readonly state: string

    /**
     * Progress percent in range [0, 100].
     */
    readonly progressPercent: number

    /**
     * Optional terminal error code.
     */
    readonly errorCode?: string
}

/**
 * Code graph request input payload.
 */
export interface IAstGetCodeGraphInput {
    /**
     * Repository identifier.
     */
    readonly repositoryId: string

    /**
     * Optional branch label.
     */
    readonly branch?: string

    /**
     * Optional retry policy override.
     */
    readonly retryPolicy?: IAstServiceGrpcServerRetryPolicyInput
}

/**
 * One code graph node payload.
 */
export interface IAstCodeGraphNode {
    /**
     * Node identifier.
     */
    readonly id: string

    /**
     * Node type.
     */
    readonly type: string

    /**
     * Node name.
     */
    readonly name: string

    /**
     * Repository-relative file path.
     */
    readonly filePath: string
}

/**
 * One code graph edge payload.
 */
export interface IAstCodeGraphEdge {
    /**
     * Source node identifier.
     */
    readonly source: string

    /**
     * Target node identifier.
     */
    readonly target: string

    /**
     * Edge type.
     */
    readonly type: string
}

/**
 * Code graph response payload.
 */
export interface IAstGetCodeGraphResult {
    /**
     * Graph nodes.
     */
    readonly nodes: readonly IAstCodeGraphNode[]

    /**
     * Graph edges.
     */
    readonly edges: readonly IAstCodeGraphEdge[]
}

/**
 * File metrics request input payload.
 */
export interface IAstGetFileMetricsInput {
    /**
     * Repository identifier.
     */
    readonly repositoryId: string

    /**
     * Commit sha snapshot.
     */
    readonly commitSha: string

    /**
     * Optional subset of file paths.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional retry policy override.
     */
    readonly retryPolicy?: IAstServiceGrpcServerRetryPolicyInput
}

/**
 * One file metrics item payload.
 */
export interface IAstFileMetricsItem {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Lines of code.
     */
    readonly loc: number

    /**
     * Cyclomatic complexity.
     */
    readonly cyclomaticComplexity: number

    /**
     * Churn score.
     */
    readonly churn: number
}

/**
 * File metrics response payload.
 */
export interface IAstGetFileMetricsResult {
    /**
     * File metrics collection.
     */
    readonly items: readonly IAstFileMetricsItem[]
}

/**
 * AST service client library contract.
 */
export interface IAstServiceClientLibrary {
    /**
     * Connects client transport.
     */
    connect(): Promise<void>

    /**
     * Disconnects client transport.
     */
    disconnect(): Promise<void>

    /**
     * Requests service health status.
     *
     * @returns Health check response.
     */
    healthCheck(): Promise<IAstServiceHealthCheckResponse>

    /**
     * Starts repository scan.
     *
     * @param input Start scan payload.
     * @returns Start scan response.
     */
    startRepositoryScan(input: IAstStartRepositoryScanInput): Promise<IAstStartRepositoryScanResult>

    /**
     * Gets repository scan status.
     *
     * @param input Status payload.
     * @returns Status response.
     */
    getRepositoryScanStatus(
        input: IAstRepositoryScanStatusInput,
    ): Promise<IAstRepositoryScanStatusResult>

    /**
     * Gets code graph snapshot.
     *
     * @param input Code graph payload.
     * @returns Code graph response.
     */
    getCodeGraph(input: IAstGetCodeGraphInput): Promise<IAstGetCodeGraphResult>

    /**
     * Gets file metrics snapshot.
     *
     * @param input File metrics payload.
     * @returns File metrics response.
     */
    getFileMetrics(input: IAstGetFileMetricsInput): Promise<IAstGetFileMetricsResult>
}

/**
 * Client library for AST service gRPC contracts.
 */
export class AstServiceClientLibrary implements IAstServiceClientLibrary {
    private readonly server: IAstServiceGrpcServer
    private readonly defaultRetryPolicy?: IAstServiceGrpcServerRetryPolicyInput
    private connected = false

    /**
     * Creates AST service client library.
     *
     * @param options Optional client options.
     */
    public constructor(options: IAstServiceClientLibraryOptions = {}) {
        this.server = options.server ?? new AstServiceGrpcServer()
        this.defaultRetryPolicy = options.defaultRetryPolicy
    }

    /**
     * Connects client transport.
     */
    public async connect(): Promise<void> {
        if (this.connected) {
            return
        }

        await this.server.start()
        this.connected = true
    }

    /**
     * Disconnects client transport.
     */
    public async disconnect(): Promise<void> {
        if (this.connected === false) {
            return
        }

        await this.server.stop()
        this.connected = false
    }

    /**
     * Requests service health status.
     *
     * @returns Health check response.
     */
    public healthCheck(): Promise<IAstServiceHealthCheckResponse> {
        return this.invokeMethod("HealthCheck", {}, undefined, undefined)
    }

    /**
     * Starts repository scan.
     *
     * @param input Start scan payload.
     * @returns Start scan response.
     */
    public startRepositoryScan(
        input: IAstStartRepositoryScanInput,
    ): Promise<IAstStartRepositoryScanResult> {
        const repositoryId = normalizeRepositoryId(input.repositoryId)
        const commitSha = normalizeCommitSha(input.commitSha)
        const filePaths = normalizeFilePaths(input.filePaths)
        const idempotencyKey = resolveStartScanIdempotencyKey(
            repositoryId,
            commitSha,
            filePaths,
            input.idempotencyKey,
        )

        return this.invokeMethod(
            "StartRepositoryScan",
            {
                repositoryId,
                commitSha,
                filePaths,
            },
            idempotencyKey,
            input.retryPolicy,
        )
    }

    /**
     * Gets repository scan status.
     *
     * @param input Status payload.
     * @returns Status response.
     */
    public getRepositoryScanStatus(
        input: IAstRepositoryScanStatusInput,
    ): Promise<IAstRepositoryScanStatusResult> {
        const requestId = normalizeRequestId(input.requestId)

        return this.invokeMethod(
            "GetRepositoryScanStatus",
            {
                requestId,
            },
            undefined,
            input.retryPolicy,
        )
    }

    /**
     * Gets code graph snapshot.
     *
     * @param input Code graph payload.
     * @returns Code graph response.
     */
    public getCodeGraph(input: IAstGetCodeGraphInput): Promise<IAstGetCodeGraphResult> {
        const repositoryId = normalizeRepositoryId(input.repositoryId)
        const branch = normalizeOptionalToken(input.branch)

        return this.invokeMethod(
            "GetCodeGraph",
            {
                repositoryId,
                ...(branch !== undefined ? {branch} : {}),
            },
            undefined,
            input.retryPolicy,
        )
    }

    /**
     * Gets file metrics snapshot.
     *
     * @param input File metrics payload.
     * @returns File metrics response.
     */
    public getFileMetrics(input: IAstGetFileMetricsInput): Promise<IAstGetFileMetricsResult> {
        const repositoryId = normalizeRepositoryId(input.repositoryId)
        const commitSha = normalizeCommitSha(input.commitSha)
        const filePaths = normalizeFilePaths(input.filePaths)

        return this.invokeMethod(
            "GetFileMetrics",
            {
                repositoryId,
                commitSha,
                filePaths,
            },
            undefined,
            input.retryPolicy,
        )
    }

    /**
     * Invokes one AST service gRPC method through transport adapter.
     *
     * @param methodName gRPC method name.
     * @param request Request payload.
     * @param idempotencyKey Optional idempotency key.
     * @param retryPolicy Optional retry policy override.
     * @returns Response payload.
     */
    private async invokeMethod<TRequest, TResponse>(
        methodName: string,
        request: TRequest,
        idempotencyKey: string | undefined,
        retryPolicy: IAstServiceGrpcServerRetryPolicyInput | undefined,
    ): Promise<TResponse> {
        ensureConnected(this.connected)
        const resolvedRetryPolicy = resolveRetryPolicy(retryPolicy, this.defaultRetryPolicy)

        try {
            const response = await this.server.invoke<TRequest, TResponse>({
                methodName,
                request,
                ...(idempotencyKey !== undefined ? {idempotencyKey} : {}),
                ...(resolvedRetryPolicy !== undefined ? {retryPolicy: resolvedRetryPolicy} : {}),
            })

            return response.response
        } catch (error) {
            throw new AstServiceClientLibraryError(
                AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.REQUEST_FAILED,
                {
                    methodName,
                    causeMessage: error instanceof Error ? error.message : undefined,
                },
            )
        }
    }
}

/**
 * Ensures client is connected.
 *
 * @param connected Connected flag.
 */
function ensureConnected(connected: boolean): void {
    if (connected) {
        return
    }

    throw new AstServiceClientLibraryError(
        AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.CLIENT_NOT_CONNECTED,
    )
}

/**
 * Normalizes repository id.
 *
 * @param repositoryId Raw repository id.
 * @returns Normalized repository id.
 */
function normalizeRepositoryId(repositoryId: string): string {
    const normalizedRepositoryId = repositoryId.trim()
    if (normalizedRepositoryId.length > 0) {
        return normalizedRepositoryId
    }

    throw new AstServiceClientLibraryError(
        AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.INVALID_REPOSITORY_ID,
        {repositoryId},
    )
}

/**
 * Normalizes commit sha.
 *
 * @param commitSha Raw commit sha.
 * @returns Normalized commit sha.
 */
function normalizeCommitSha(commitSha: string): string {
    const normalizedCommitSha = commitSha.trim()
    const commitShaPattern = /^[a-f0-9]{7,64}$/i

    if (commitShaPattern.test(normalizedCommitSha)) {
        return normalizedCommitSha
    }

    throw new AstServiceClientLibraryError(
        AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.INVALID_COMMIT_SHA,
    )
}

/**
 * Normalizes request id.
 *
 * @param requestId Raw request id.
 * @returns Normalized request id.
 */
function normalizeRequestId(requestId: string): string {
    const normalizedRequestId = requestId.trim()
    if (normalizedRequestId.length > 0) {
        return normalizedRequestId
    }

    throw new AstServiceClientLibraryError(
        AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.INVALID_REQUEST_ID,
        {requestId},
    )
}

/**
 * Normalizes optional token.
 *
 * @param value Raw optional token.
 * @returns Normalized token or undefined.
 */
function normalizeOptionalToken(value: string | undefined): string | undefined {
    const normalizedValue = value?.trim()
    if (normalizedValue === undefined || normalizedValue.length === 0) {
        return undefined
    }

    return normalizedValue
}

/**
 * Normalizes optional file path filter.
 *
 * @param filePaths Optional file path filter.
 * @returns Sorted unique normalized file paths.
 */
function normalizeFilePaths(filePaths: readonly string[] | undefined): readonly string[] {
    if (filePaths === undefined) {
        return []
    }

    const normalizedPaths = new Set<string>()

    for (const filePath of filePaths) {
        try {
            normalizedPaths.add(FilePath.create(filePath).toString())
        } catch {
            throw new AstServiceClientLibraryError(
                AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.INVALID_FILE_PATH,
                {filePath},
            )
        }
    }

    return [...normalizedPaths].sort((left, right) => left.localeCompare(right))
}

/**
 * Resolves start scan idempotency key.
 *
 * @param repositoryId Normalized repository id.
 * @param commitSha Normalized commit sha.
 * @param filePaths Normalized file paths.
 * @param idempotencyKey Optional idempotency key override.
 * @returns Resolved idempotency key.
 */
function resolveStartScanIdempotencyKey(
    repositoryId: string,
    commitSha: string,
    filePaths: readonly string[],
    idempotencyKey: string | undefined,
): string {
    if (idempotencyKey === undefined) {
        return `scan:${repositoryId}:${commitSha}:${filePaths.join(",")}`
    }

    const normalizedIdempotencyKey = idempotencyKey.trim()
    if (normalizedIdempotencyKey.length > 0) {
        return normalizedIdempotencyKey
    }

    throw new AstServiceClientLibraryError(
        AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.INVALID_IDEMPOTENCY_KEY,
        {idempotencyKey},
    )
}

/**
 * Resolves retry policy for one request.
 *
 * @param retryPolicy Optional runtime retry policy.
 * @param defaultRetryPolicy Optional default retry policy.
 * @returns Resolved retry policy.
 */
function resolveRetryPolicy(
    retryPolicy: IAstServiceGrpcServerRetryPolicyInput | undefined,
    defaultRetryPolicy: IAstServiceGrpcServerRetryPolicyInput | undefined,
): IAstServiceGrpcServerRetryPolicyInput | undefined {
    if (retryPolicy !== undefined) {
        return retryPolicy
    }

    return defaultRetryPolicy
}
