import {QdrantClient, type QdrantClientParams} from "@qdrant/js-client-rest"

import type {
    IVectorChunkDTO,
    IVectorRepository,
    IVectorSearchResultDTO,
} from "@codenautic/core"

import {
    QDRANT_VECTOR_REPOSITORY_ERROR_CODE,
    QdrantVectorRepositoryError,
} from "./qdrant-vector-repository.error"

const DEFAULT_DISTANCE = "Cosine"
const DEFAULT_SEARCH_LIMIT = 10

type QdrantVectorDistance = "Cosine" | "Euclid" | "Dot" | "Manhattan"
type QdrantScalar = string | number | boolean
type QdrantPayloadValue =
    | QdrantScalar
    | null
    | readonly QdrantPayloadValue[]
    | IQdrantPayloadRecord

interface IQdrantPayloadRecord {
    readonly [key: string]: QdrantPayloadValue
}

export interface IQdrantCollectionExistence {
    readonly exists: boolean
}

export interface IQdrantCollectionInfo {
    readonly config: {
        readonly params: {
            readonly vectors?:
                | {
                    readonly size: number
                }
                | Readonly<Record<string, {readonly size: number} | undefined>>
        }
    }
}

interface IQdrantPoint {
    readonly id: string
    readonly vector: readonly number[]
    readonly payload: IQdrantPayloadRecord
}

interface IQdrantFieldCondition {
    readonly key: string
    readonly match?:
        | {
            readonly value: QdrantScalar
        }
        | {
            readonly any: readonly string[] | readonly number[]
        }
    readonly is_null?: boolean
}

interface IQdrantFilter {
    readonly must: readonly IQdrantFieldCondition[]
}

export interface IQdrantScoredPoint {
    readonly id: string | number
    readonly score: number
    readonly payload?: Readonly<Record<string, unknown>> | null
}

/**
 * Minimal Qdrant client contract required by the vector repository.
 */
export interface IQdrantVectorClient {
    /**
     * Checks whether collection exists.
     *
     * @param collectionName Qdrant collection name.
     * @returns Collection existence payload.
     */
    collectionExists(collectionName: string): Promise<IQdrantCollectionExistence>

    /**
     * Loads collection configuration.
     *
     * @param collectionName Qdrant collection name.
     * @returns Collection configuration payload.
     */
    getCollection(collectionName: string): Promise<IQdrantCollectionInfo>

    /**
     * Creates vector collection.
     *
     * @param collectionName Qdrant collection name.
     * @param args Collection creation payload.
     * @returns True when creation succeeded.
     */
    createCollection(
        collectionName: string,
        args: Readonly<{
            vectors: {
                size: number
                distance: QdrantVectorDistance
            }
            on_disk_payload?: boolean
        }>,
    ): Promise<boolean>

    /**
     * Upserts vector points.
     *
     * @param collectionName Qdrant collection name.
     * @param args Upsert payload.
     * @returns Nothing important for repository contract.
     */
    upsert(
        collectionName: string,
        args: Readonly<{
            wait?: boolean
            points: readonly IQdrantPoint[]
        }>,
    ): Promise<unknown>

    /**
     * Searches nearest vectors.
     *
     * @param collectionName Qdrant collection name.
     * @param args Search payload.
     * @returns Ranked scored points.
     */
    search(
        collectionName: string,
        args: Readonly<{
            vector: readonly number[]
            filter?: IQdrantFilter
            limit: number
            with_payload: true
        }>,
    ): Promise<readonly IQdrantScoredPoint[]>

    /**
     * Deletes vector points by id list.
     *
     * @param collectionName Qdrant collection name.
     * @param args Delete payload.
     * @returns Nothing important for repository contract.
     */
    delete(
        collectionName: string,
        args: Readonly<{
            wait?: boolean
            points: readonly string[]
        }>,
    ): Promise<unknown>
}

interface IQdrantCollectionState {
    readonly exists: boolean
    readonly vectorSize?: number
}

/**
 * Constructor options for Qdrant vector repository.
 */
export interface IQdrantVectorRepositoryOptions extends QdrantClientParams {
    /**
     * Collection storing vectors and metadata payload.
     */
    readonly collectionName: string

    /**
     * Optional injected Qdrant client for tests.
     */
    readonly client?: IQdrantVectorClient

    /**
     * Optional configured collection vector size.
     */
    readonly vectorSize?: number

    /**
     * Optional distance metric for newly created collections.
     */
    readonly distance?: QdrantVectorDistance

    /**
     * Whether write operations should wait for completion.
     */
    readonly wait?: boolean

    /**
     * Whether collection payload should be stored on disk.
     */
    readonly onDiskPayload?: boolean
}

/**
 * Qdrant-backed implementation of the shared vector repository contract.
 */
export class QdrantVectorRepository implements IVectorRepository {
    private readonly client: IQdrantVectorClient
    private readonly collectionName: string
    private readonly configuredVectorSize?: number
    private readonly distance: QdrantVectorDistance
    private readonly wait: boolean
    private readonly onDiskPayload: boolean
    private collectionState?: IQdrantCollectionState

    /**
     * Creates Qdrant vector repository.
     *
     * @param options Repository dependencies and configuration.
     */
    public constructor(options: IQdrantVectorRepositoryOptions) {
        this.client = options.client ?? createQdrantClient(options)
        this.collectionName = normalizeCollectionName(options.collectionName)
        this.configuredVectorSize = normalizeOptionalVectorSize(options.vectorSize)
        this.distance = normalizeDistance(options.distance)
        this.wait = options.wait ?? true
        this.onDiskPayload = options.onDiskPayload ?? true
    }

    /**
     * Inserts or updates vectors by stable point identifiers.
     *
     * @param chunks Vector chunks.
     * @returns Nothing.
     */
    public async upsert(chunks: readonly IVectorChunkDTO[]): Promise<void> {
        if (chunks.length === 0) {
            return
        }

        const normalizedChunks = chunks.map(normalizeVectorChunk)
        const vectorSize = resolveBatchVectorSize(normalizedChunks)

        await this.ensureCollection(vectorSize)
        await this.executeClientRequest(() => {
            return this.client.upsert(this.collectionName, {
                wait: this.wait,
                points: normalizedChunks.map(mapVectorChunkToPoint),
            })
        })
    }

    /**
     * Searches nearest vectors with optional metadata filters.
     *
     * @param query Query embedding vector.
     * @param filters Optional metadata filters.
     * @param limit Optional result count limit.
     * @returns Ranked vector search results.
     */
    public async search(
        query: readonly number[],
        filters?: Readonly<Record<string, unknown>>,
        limit?: number,
    ): Promise<readonly IVectorSearchResultDTO[]> {
        const normalizedQuery = normalizeVector(query, "query")
        validateConfiguredVectorSize(this.configuredVectorSize, normalizedQuery.length)

        const state = await this.resolveCollectionState()
        if (state.exists === false) {
            return []
        }

        validateCollectionVectorSize(state.vectorSize, normalizedQuery.length)
        const normalizedLimit = normalizeSearchLimit(limit)
        const filter = normalizeOptionalSearchFilter(filters)
        const points = await this.executeClientRequest(() => {
            return this.client.search(this.collectionName, {
                vector: normalizedQuery,
                filter,
                limit: normalizedLimit,
                with_payload: true,
            })
        })

        return points.map(mapScoredPointToSearchResult)
    }

    /**
     * Deletes vectors by stable point identifiers.
     *
     * @param ids Vector identifiers.
     * @returns Nothing.
     */
    public async delete(ids: readonly string[]): Promise<void> {
        const normalizedIds = ids.map(normalizeVectorId)
        if (normalizedIds.length === 0) {
            return
        }

        const state = await this.resolveCollectionState()
        if (state.exists === false) {
            return
        }

        await this.executeClientRequest(() => {
            return this.client.delete(this.collectionName, {
                wait: this.wait,
                points: normalizedIds,
            })
        })
    }

    /**
     * Ensures collection exists and matches expected vector size.
     *
     * @param vectorSize Expected vector size for the current operation.
     * @returns Nothing.
     */
    private async ensureCollection(vectorSize: number): Promise<void> {
        const expectedVectorSize = resolveExpectedVectorSize(
            this.configuredVectorSize,
            vectorSize,
        )
        const state = await this.resolveCollectionState()

        if (state.exists === false) {
            await this.executeClientRequest(() => {
                return this.client.createCollection(this.collectionName, {
                    vectors: {
                        size: expectedVectorSize,
                        distance: this.distance,
                    },
                    on_disk_payload: this.onDiskPayload,
                })
            })
            this.collectionState = {
                exists: true,
                vectorSize: expectedVectorSize,
            }

            return
        }

        validateCollectionVectorSize(state.vectorSize, expectedVectorSize)
    }

    /**
     * Loads and caches collection state from Qdrant.
     *
     * @returns Cached collection state.
     */
    private async resolveCollectionState(): Promise<IQdrantCollectionState> {
        if (this.collectionState !== undefined) {
            return this.collectionState
        }

        const existence = await this.executeClientRequest(() => {
            return this.client.collectionExists(this.collectionName)
        })

        if (existence.exists === false) {
            this.collectionState = {
                exists: false,
            }

            return this.collectionState
        }

        const collectionInfo = await this.executeClientRequest(() => {
            return this.client.getCollection(this.collectionName)
        })
        const vectorSize = resolveCollectionVectorSize(
            this.collectionName,
            collectionInfo,
        )

        validateConfiguredVectorSize(this.configuredVectorSize, vectorSize)
        this.collectionState = {
            exists: true,
            vectorSize,
        }

        return this.collectionState
    }

    /**
     * Executes Qdrant client request and wraps dependency failures.
     *
     * @param execute Async client request callback.
     * @returns Client result.
     */
    private async executeClientRequest<TResult>(
        execute: () => Promise<TResult>,
    ): Promise<TResult> {
        try {
            return await execute()
        } catch (error) {
            throw new QdrantVectorRepositoryError(
                QDRANT_VECTOR_REPOSITORY_ERROR_CODE.QDRANT_REQUEST_FAILED,
                {
                    collectionName: this.collectionName,
                    causeMessage: error instanceof Error ? error.message : String(error),
                },
            )
        }
    }
}

/**
 * Creates Qdrant SDK client from repository options.
 *
 * @param options Repository options.
 * @returns Qdrant client instance.
 */
function createQdrantClient(
    options: IQdrantVectorRepositoryOptions,
): IQdrantVectorClient {
    const sdkClient = new QdrantClient(options)

    return {
        collectionExists(collectionName: string): Promise<IQdrantCollectionExistence> {
            return sdkClient.collectionExists(collectionName)
        },
        getCollection(collectionName: string): Promise<IQdrantCollectionInfo> {
            return sdkClient.getCollection(collectionName)
        },
        createCollection(
            collectionName: string,
            args: Readonly<{
                vectors: {
                    size: number
                    distance: QdrantVectorDistance
                }
                on_disk_payload?: boolean
            }>,
        ): Promise<boolean> {
            return sdkClient.createCollection(collectionName, {
                vectors: {
                    size: args.vectors.size,
                    distance: args.vectors.distance,
                },
                on_disk_payload: args.on_disk_payload,
            })
        },
        upsert(
            collectionName: string,
            args: Readonly<{
                wait?: boolean
                points: readonly IQdrantPoint[]
            }>,
        ): Promise<unknown> {
            return sdkClient.upsert(collectionName, {
                wait: args.wait,
                points: args.points.map(clonePointForSdk),
            })
        },
        search(
            collectionName: string,
            args: Readonly<{
                vector: readonly number[]
                filter?: IQdrantFilter
                limit: number
                with_payload: true
            }>,
        ): Promise<readonly IQdrantScoredPoint[]> {
            return sdkClient.search(collectionName, {
                vector: [...args.vector],
                filter: cloneFilterForSdk(args.filter),
                limit: args.limit,
                with_payload: args.with_payload,
            })
        },
        delete(
            collectionName: string,
            args: Readonly<{
                wait?: boolean
                points: readonly string[]
            }>,
        ): Promise<unknown> {
            return sdkClient.delete(collectionName, {
                wait: args.wait,
                points: [...args.points],
            })
        },
    }
}

/**
 * Normalizes collection name.
 *
 * @param collectionName Raw collection name.
 * @returns Trimmed collection name.
 */
function normalizeCollectionName(collectionName: string): string {
    const normalizedCollectionName = collectionName.trim()

    if (normalizedCollectionName.length > 0) {
        return normalizedCollectionName
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_COLLECTION_NAME,
        {
            collectionName,
        },
    )
}

/**
 * Normalizes optional configured vector size.
 *
 * @param vectorSize Raw configured vector size.
 * @returns Normalized vector size or undefined.
 */
function normalizeOptionalVectorSize(vectorSize: number | undefined): number | undefined {
    if (vectorSize === undefined) {
        return undefined
    }

    if (Number.isInteger(vectorSize) && vectorSize > 0) {
        return vectorSize
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_VECTOR_SIZE,
        {
            vectorSize,
        },
    )
}

/**
 * Normalizes Qdrant distance metric.
 *
 * @param distance Raw distance metric.
 * @returns Normalized distance metric.
 */
function normalizeDistance(distance: QdrantVectorDistance | undefined): QdrantVectorDistance {
    if (distance === undefined) {
        return DEFAULT_DISTANCE
    }

    if (isSupportedDistance(distance)) {
        return distance
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_DISTANCE,
        {
            distance,
        },
    )
}

/**
 * Checks whether distance metric is supported.
 *
 * @param distance Candidate distance metric.
 * @returns True when supported.
 */
function isSupportedDistance(distance: string): distance is QdrantVectorDistance {
    return (
        distance === "Cosine" ||
        distance === "Euclid" ||
        distance === "Dot" ||
        distance === "Manhattan"
    )
}

/**
 * Normalizes one vector-chunk DTO before Qdrant mapping.
 *
 * @param chunk Raw vector chunk.
 * @returns Normalized vector chunk.
 */
function normalizeVectorChunk(chunk: IVectorChunkDTO): IVectorChunkDTO {
    return {
        id: normalizeVectorId(chunk.id),
        vector: normalizeVector(chunk.vector, `vector:${chunk.id}`),
        metadata: normalizeMetadataRecord(chunk.metadata, `metadata:${chunk.id}`),
    }
}

/**
 * Normalizes point identifier.
 *
 * @param vectorId Raw point identifier.
 * @returns Trimmed point identifier.
 */
function normalizeVectorId(vectorId: string): string {
    const normalizedVectorId = vectorId.trim()

    if (normalizedVectorId.length > 0) {
        return normalizedVectorId
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_VECTOR_ID,
        {
            vectorId,
        },
    )
}

/**
 * Normalizes vector payload and validates numeric values.
 *
 * @param vector Raw vector payload.
 * @param fieldPath Field label for error reporting.
 * @returns Normalized vector payload.
 */
function normalizeVector(
    vector: readonly number[],
    fieldPath: string,
): readonly number[] {
    if (vector.length === 0) {
        throw new QdrantVectorRepositoryError(
            QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_VECTOR,
            {
                fieldPath,
            },
        )
    }

    for (const value of vector) {
        if (Number.isFinite(value) === false) {
            throw new QdrantVectorRepositoryError(
                QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_VECTOR,
                {
                    fieldPath,
                },
            )
        }
    }

    return [...vector]
}

/**
 * Resolves shared vector size for normalized upsert batch.
 *
 * @param chunks Normalized vector chunks.
 * @returns Batch vector size.
 */
function resolveBatchVectorSize(chunks: readonly IVectorChunkDTO[]): number {
    const vectorSize = chunks[0]?.vector.length

    if (vectorSize === undefined) {
        throw new QdrantVectorRepositoryError(
            QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_VECTOR,
            {
                fieldPath: "batch",
            },
        )
    }

    for (const chunk of chunks) {
        validateCollectionVectorSize(vectorSize, chunk.vector.length)
    }

    return vectorSize
}

/**
 * Validates vector size against configured repository value.
 *
 * @param configuredVectorSize Configured vector size.
 * @param actualVectorSize Actual vector size.
 * @returns Nothing.
 */
function validateConfiguredVectorSize(
    configuredVectorSize: number | undefined,
    actualVectorSize: number,
): void {
    if (configuredVectorSize === undefined) {
        return
    }

    validateCollectionVectorSize(configuredVectorSize, actualVectorSize)
}

/**
 * Resolves vector size to use for collection bootstrap.
 *
 * @param configuredVectorSize Optional configured vector size.
 * @param actualVectorSize Actual vector size from operation payload.
 * @returns Resolved vector size.
 */
function resolveExpectedVectorSize(
    configuredVectorSize: number | undefined,
    actualVectorSize: number,
): number {
    validateConfiguredVectorSize(configuredVectorSize, actualVectorSize)
    return configuredVectorSize ?? actualVectorSize
}

/**
 * Validates vector-size compatibility.
 *
 * @param expectedVectorSize Expected vector size.
 * @param actualVectorSize Actual vector size.
 * @returns Nothing.
 */
function validateCollectionVectorSize(
    expectedVectorSize: number | undefined,
    actualVectorSize: number,
): void {
    if (
        expectedVectorSize !== undefined &&
        expectedVectorSize === actualVectorSize
    ) {
        return
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.COLLECTION_VECTOR_SIZE_MISMATCH,
        {
            expectedVectorSize,
            actualVectorSize,
        },
    )
}

/**
 * Resolves collection vector size from Qdrant collection info.
 *
 * @param collectionName Qdrant collection name.
 * @param info Collection configuration payload.
 * @returns Resolved vector size.
 */
function resolveCollectionVectorSize(
    collectionName: string,
    info: IQdrantCollectionInfo,
): number {
    const vectors = info.config.params.vectors

    if (vectors === undefined) {
        throw new QdrantVectorRepositoryError(
            QDRANT_VECTOR_REPOSITORY_ERROR_CODE.UNSUPPORTED_COLLECTION_VECTOR_CONFIG,
            {
                collectionName,
            },
        )
    }

    if (hasNumericSize(vectors)) {
        return vectors.size
    }

    const vectorConfigs = Object.entries(vectors).filter(([, value]) => {
        return value !== undefined
    })
    const defaultVectorConfig = vectors["default"]

    if (defaultVectorConfig !== undefined) {
        return defaultVectorConfig.size
    }

    if (vectorConfigs.length === 1) {
        const firstVectorConfig = vectorConfigs[0]

        if (firstVectorConfig !== undefined && firstVectorConfig[1] !== undefined) {
            return firstVectorConfig[1].size
        }
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.UNSUPPORTED_COLLECTION_VECTOR_CONFIG,
        {
            collectionName,
        },
    )
}

/**
 * Checks whether vectors config is single-vector shape.
 *
 * @param value Candidate vectors config.
 * @returns True when config has direct numeric size.
 */
function hasNumericSize(value: unknown): value is {readonly size: number} {
    return (
        typeof value === "object" &&
        value !== null &&
        "size" in value &&
        typeof value.size === "number"
    )
}

/**
 * Maps normalized vector chunk to Qdrant point payload.
 *
 * @param chunk Normalized vector chunk.
 * @returns Qdrant point payload.
 */
function mapVectorChunkToPoint(chunk: IVectorChunkDTO): IQdrantPoint {
    return {
        id: chunk.id,
        vector: chunk.vector,
        payload: chunk.metadata as IQdrantPayloadRecord,
    }
}

/**
 * Clones point payload into mutable SDK-compatible shape.
 *
 * @param point Normalized repository point.
 * @returns Mutable SDK point payload.
 */
function clonePointForSdk(point: IQdrantPoint): {
    id: string
    vector: number[]
    payload: Record<string, unknown>
} {
    return {
        id: point.id,
        vector: [...point.vector],
        payload: clonePayloadRecordForSdk(point.payload),
    }
}

/**
 * Clones normalized payload record into mutable SDK-compatible object.
 *
 * @param payload Normalized repository payload.
 * @returns Mutable SDK payload object.
 */
function clonePayloadRecordForSdk(payload: IQdrantPayloadRecord): Record<string, unknown> {
    const clonedPayload: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(payload)) {
        clonedPayload[key] = clonePayloadValueForSdk(value)
    }

    return clonedPayload
}

/**
 * Clones one payload value into SDK-compatible mutable structure.
 *
 * @param value Normalized payload value.
 * @returns Mutable payload value.
 */
function clonePayloadValueForSdk(value: QdrantPayloadValue): unknown {
    if (Array.isArray(value)) {
        return value.map((item: QdrantPayloadValue): unknown => {
            return clonePayloadValueForSdk(item)
        })
    }

    if (isPayloadRecord(value)) {
        return clonePayloadRecordForSdk(value)
    }

    return value
}

/**
 * Checks whether payload value is a nested payload record.
 *
 * @param value Candidate payload value.
 * @returns True when payload value is a nested record.
 */
function isPayloadRecord(value: QdrantPayloadValue): value is IQdrantPayloadRecord {
    return typeof value === "object" && value !== null && Array.isArray(value) === false
}

/**
 * Clones optional filter into mutable SDK-compatible shape.
 *
 * @param filter Optional repository filter.
 * @returns Mutable SDK filter or undefined.
 */
function cloneFilterForSdk(
    filter: IQdrantFilter | undefined,
): Readonly<Record<string, unknown>> | undefined {
    if (filter === undefined) {
        return undefined
    }

    return {
        must: filter.must.map((condition): Record<string, unknown> => {
            return cloneFieldConditionForSdk(condition)
        }),
    }
}

/**
 * Clones one field condition into mutable SDK-compatible shape.
 *
 * @param condition Repository filter condition.
 * @returns Mutable SDK filter condition.
 */
function cloneFieldConditionForSdk(
    condition: IQdrantFieldCondition,
): Record<string, unknown> {
    return {
        key: condition.key,
        match:
            condition.match === undefined
                ? undefined
                : cloneMatchConditionForSdk(condition.match),
        is_null: condition.is_null,
    }
}

/**
 * Clones one match condition into mutable SDK-compatible shape.
 *
 * @param match Repository filter match condition.
 * @returns Mutable SDK match condition.
 */
function cloneMatchConditionForSdk(
    match:
        | {
            readonly value: QdrantScalar
        }
        | {
            readonly any: readonly string[] | readonly number[]
        },
):
    | Record<string, QdrantScalar>
    | Record<string, readonly string[] | readonly number[]> {
    if ("value" in match) {
        return {
            value: match.value,
        }
    }

    if (match.any.every((item): item is string => typeof item === "string")) {
        return {
            any: [...match.any],
        }
    }

    return {
        any: [...match.any],
    }
}

/**
 * Normalizes optional metadata filter record into Qdrant filter.
 *
 * @param filters Raw metadata filters.
 * @returns Qdrant filter or undefined.
 */
function normalizeOptionalSearchFilter(
    filters: Readonly<Record<string, unknown>> | undefined,
): IQdrantFilter | undefined {
    if (filters === undefined) {
        return undefined
    }

    const conditions = buildFilterConditions(filters, undefined)

    return conditions.length === 0 ? undefined : {must: conditions}
}

/**
 * Builds Qdrant field conditions from metadata-filter record.
 *
 * @param value Filter subtree.
 * @param parentPath Optional parent key path.
 * @returns Qdrant field conditions.
 */
function buildFilterConditions(
    value: Readonly<Record<string, unknown>>,
    parentPath: string | undefined,
): readonly IQdrantFieldCondition[] {
    const conditions: IQdrantFieldCondition[] = []

    for (const [rawKey, rawValue] of Object.entries(value)) {
        const key = buildFilterPath(parentPath, rawKey)

        if (isPlainObject(rawValue)) {
            conditions.push(...buildFilterConditions(rawValue, key))
            continue
        }

        conditions.push(createFieldCondition(key, rawValue))
    }

    return conditions
}

/**
 * Builds nested metadata-filter path.
 *
 * @param parentPath Optional parent key path.
 * @param rawKey Raw filter key.
 * @returns Nested metadata-filter path.
 */
function buildFilterPath(parentPath: string | undefined, rawKey: string): string {
    const normalizedKey = rawKey.trim()

    if (normalizedKey.length === 0) {
        throw new QdrantVectorRepositoryError(
            QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_FILTER_KEY,
            {
                fieldPath: parentPath ?? "<root>",
            },
        )
    }

    return parentPath === undefined ? normalizedKey : `${parentPath}.${normalizedKey}`
}

/**
 * Creates one Qdrant field condition from scalar or scalar-array filter value.
 *
 * @param key Nested metadata-filter path.
 * @param value Raw filter value.
 * @returns Qdrant field condition.
 */
function createFieldCondition(
    key: string,
    value: unknown,
): IQdrantFieldCondition {
    if (value === null) {
        return {
            key,
            is_null: true,
        }
    }

    if (isScalar(value)) {
        return {
            key,
            match: {
                value,
            },
        }
    }

    if (Array.isArray(value)) {
        return createArrayFieldCondition(key, value)
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.UNSUPPORTED_FILTER_VALUE,
        {
            fieldPath: key,
        },
    )
}

/**
 * Creates one Qdrant field condition from scalar-array filter value.
 *
 * @param key Nested metadata-filter path.
 * @param value Raw filter array.
 * @returns Qdrant field condition.
 */
function createArrayFieldCondition(
    key: string,
    value: readonly unknown[],
): IQdrantFieldCondition {
    if (value.length === 0) {
        throw new QdrantVectorRepositoryError(
            QDRANT_VECTOR_REPOSITORY_ERROR_CODE.UNSUPPORTED_FILTER_VALUE,
            {
                fieldPath: key,
            },
        )
    }

    if (value.every((item): item is string => typeof item === "string")) {
        return {
            key,
            match: {
                any: value,
            },
        }
    }

    if (value.every((item): item is number => typeof item === "number")) {
        for (const item of value) {
            if (Number.isFinite(item) === false) {
                throw new QdrantVectorRepositoryError(
                    QDRANT_VECTOR_REPOSITORY_ERROR_CODE.UNSUPPORTED_FILTER_VALUE,
                    {
                        fieldPath: key,
                    },
                )
            }
        }

        return {
            key,
            match: {
                any: value,
            },
        }
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.UNSUPPORTED_FILTER_VALUE,
        {
            fieldPath: key,
        },
    )
}

/**
 * Checks whether value is supported scalar filter or payload value.
 *
 * @param value Candidate value.
 * @returns True when value is scalar.
 */
function isScalar(value: unknown): value is QdrantScalar {
    return (
        typeof value === "string" ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value))
    )
}

/**
 * Normalizes metadata record into Qdrant payload-safe structure.
 *
 * @param metadata Raw metadata record.
 * @param parentPath Metadata path prefix.
 * @returns Normalized payload record.
 */
function normalizeMetadataRecord(
    metadata: Readonly<Record<string, unknown>>,
    parentPath: string,
): Readonly<Record<string, unknown>> {
    const normalizedMetadata: Record<string, QdrantPayloadValue> = {}

    for (const [rawKey, rawValue] of Object.entries(metadata)) {
        const key = buildMetadataPath(parentPath, rawKey)

        normalizedMetadata[rawKey.trim()] = normalizeMetadataValue(rawValue, key)
    }

    return normalizedMetadata
}

/**
 * Builds nested metadata path for error reporting.
 *
 * @param parentPath Parent metadata path.
 * @param rawKey Raw metadata key.
 * @returns Nested metadata path.
 */
function buildMetadataPath(parentPath: string, rawKey: string): string {
    const normalizedKey = rawKey.trim()

    if (normalizedKey.length > 0) {
        return `${parentPath}.${normalizedKey}`
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_METADATA,
        {
            fieldPath: parentPath,
        },
    )
}

/**
 * Normalizes metadata payload value into Qdrant-safe JSON-like structure.
 *
 * @param value Raw metadata payload value.
 * @param fieldPath Metadata field path.
 * @returns Normalized payload value.
 */
function normalizeMetadataValue(
    value: unknown,
    fieldPath: string,
): QdrantPayloadValue {
    if (value === null || isScalar(value)) {
        return value
    }

    if (Array.isArray(value)) {
        return value.map((item, index): QdrantPayloadValue => {
            return normalizeMetadataValue(item, `${fieldPath}.${String(index)}`)
        })
    }

    if (isPlainObject(value)) {
        return normalizeMetadataRecord(value, fieldPath) as IQdrantPayloadRecord
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_METADATA,
        {
            fieldPath,
        },
    )
}

/**
 * Checks whether value is plain object record.
 *
 * @param value Candidate value.
 * @returns True when value is plain object.
 */
function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false
    }

    const prototype: unknown = Object.getPrototypeOf(value)

    return prototype === Object.prototype || prototype === null
}

/**
 * Normalizes optional search-result limit.
 *
 * @param limit Raw result limit.
 * @returns Normalized positive integer search limit.
 */
function normalizeSearchLimit(limit: number | undefined): number {
    if (limit === undefined) {
        return DEFAULT_SEARCH_LIMIT
    }

    if (Number.isInteger(limit) && limit > 0) {
        return limit
    }

    throw new QdrantVectorRepositoryError(
        QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_LIMIT,
        {
            limit,
        },
    )
}

/**
 * Maps Qdrant scored point to shared vector-search DTO.
 *
 * @param point Raw Qdrant scored point.
 * @returns Shared vector-search result DTO.
 */
function mapScoredPointToSearchResult(
    point: IQdrantScoredPoint,
): IVectorSearchResultDTO {
    return {
        id: String(point.id),
        score: point.score,
        metadata: normalizeSearchResultPayload(point.payload),
    }
}

/**
 * Normalizes scored-point payload into shared metadata record.
 *
 * @param payload Raw Qdrant payload.
 * @returns Shared metadata record.
 */
function normalizeSearchResultPayload(
    payload: Readonly<Record<string, unknown>> | null | undefined,
): Readonly<Record<string, unknown>> {
    if (payload === null || payload === undefined) {
        return {}
    }

    return normalizeMetadataRecord(payload, "payload")
}
