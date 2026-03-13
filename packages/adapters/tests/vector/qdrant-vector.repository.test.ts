import {describe, expect, test} from "bun:test"

import type {IVectorChunkDTO} from "@codenautic/core"

import {
    QDRANT_VECTOR_REPOSITORY_ERROR_CODE,
    QdrantVectorRepository,
    QdrantVectorRepositoryError,
    type IQdrantCollectionExistence,
    type IQdrantCollectionInfo,
    type IQdrantScoredPoint,
    type IQdrantVectorClient,
} from "../../src/vector"

type QdrantCreateCollectionArgs = Parameters<IQdrantVectorClient["createCollection"]>[1]
type QdrantDeleteArgs = Parameters<IQdrantVectorClient["delete"]>[1]
type QdrantSearchArgs = Parameters<IQdrantVectorClient["search"]>[1]
type QdrantUpsertArgs = Parameters<IQdrantVectorClient["upsert"]>[1]

interface IQdrantClientMockOptions {
    readonly initialExists?: boolean
    readonly initialVectorSize?: number
    readonly failCollectionExists?: boolean
}

interface IQdrantStoredPoint {
    readonly id: string
    readonly vector: readonly number[]
    readonly payload: Readonly<Record<string, unknown>>
}

interface IQdrantClientMockState {
    readonly collectionExistsCalls: string[]
    readonly getCollectionCalls: string[]
    readonly createCollectionCalls: QdrantCreateCollectionArgs[]
    readonly upsertCalls: QdrantUpsertArgs[]
    readonly searchCalls: QdrantSearchArgs[]
    readonly deleteCalls: QdrantDeleteArgs[]
    readonly pointsById: Map<string, IQdrantStoredPoint>
}

interface IQdrantClientMock {
    readonly client: IQdrantVectorClient
    readonly state: IQdrantClientMockState
}

/**
 * Creates deterministic in-memory Qdrant client mock for repository tests.
 *
 * @param options Optional initial state and failure toggles.
 * @returns Test client plus captured state.
 */
function createQdrantClientMock(
    options: IQdrantClientMockOptions = {},
): IQdrantClientMock {
    let collectionExists = options.initialExists ?? false
    let collectionVectorSize = options.initialVectorSize
    const state: IQdrantClientMockState = {
        collectionExistsCalls: [],
        getCollectionCalls: [],
        createCollectionCalls: [],
        upsertCalls: [],
        searchCalls: [],
        deleteCalls: [],
        pointsById: new Map<string, IQdrantStoredPoint>(),
    }

    const client: IQdrantVectorClient = {
        collectionExists(collectionName: string): Promise<IQdrantCollectionExistence> {
            state.collectionExistsCalls.push(collectionName)

            if (options.failCollectionExists === true) {
                return Promise.reject(new Error("qdrant unavailable"))
            }

            return Promise.resolve({
                exists: collectionExists,
            })
        },
        getCollection(collectionName: string): Promise<IQdrantCollectionInfo> {
            state.getCollectionCalls.push(collectionName)

            return Promise.resolve({
                config: {
                    params: {
                        vectors:
                            collectionVectorSize === undefined
                                ? undefined
                                : {
                                    size: collectionVectorSize,
                                },
                    },
                },
            })
        },
        createCollection(
            _collectionName: string,
            args: QdrantCreateCollectionArgs,
        ): Promise<boolean> {
            state.createCollectionCalls.push(args)
            collectionExists = true
            collectionVectorSize = args.vectors.size

            return Promise.resolve(true)
        },
        upsert(_collectionName: string, args: QdrantUpsertArgs): Promise<unknown> {
            state.upsertCalls.push(args)

            for (const point of args.points) {
                state.pointsById.set(point.id, {
                    id: point.id,
                    vector: [...point.vector],
                    payload: cloneRecord(point.payload),
                })
            }

            return Promise.resolve(undefined)
        },
        search(_collectionName: string, args: QdrantSearchArgs): Promise<readonly IQdrantScoredPoint[]> {
            state.searchCalls.push(args)

            const results = Array.from(state.pointsById.values())
                .filter((point): boolean => {
                    return matchesFilter(point.payload, args.filter)
                })
                .map((point): IQdrantScoredPoint => {
                    return {
                        id: point.id,
                        score: computeDotProduct(args.vector, point.vector),
                        payload: cloneRecord(point.payload),
                    }
                })
                .sort((left, right): number => right.score - left.score)

            return Promise.resolve(results.slice(0, args.limit))
        },
        delete(_collectionName: string, args: QdrantDeleteArgs): Promise<unknown> {
            state.deleteCalls.push(args)

            for (const pointId of args.points) {
                state.pointsById.delete(pointId)
            }

            return Promise.resolve(undefined)
        },
    }

    return {
        client,
        state,
    }
}

/**
 * Clones metadata-like record for stable assertions.
 *
 * @param value Source record.
 * @returns Deep-cloned record.
 */
function cloneRecord(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
    return Object.fromEntries(
        Object.entries(value).map(([key, item]): [string, unknown] => {
            return [key, cloneValue(item)]
        }),
    )
}

/**
 * Clones one metadata-like value recursively.
 *
 * @param value Source value.
 * @returns Deep-cloned value.
 */
function cloneValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item): unknown => {
            return cloneValue(item)
        })
    }

    if (isPlainObject(value)) {
        return cloneRecord(value)
    }

    return value
}

/**
 * Checks whether value is a plain object.
 *
 * @param value Candidate value.
 * @returns True when value is a plain object.
 */
function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === "object" && value !== null && Array.isArray(value) === false
}

/**
 * Evaluates repository filter against stored payload.
 *
 * @param payload Stored payload.
 * @param filter Optional search filter.
 * @returns True when payload matches all conditions.
 */
function matchesFilter(
    payload: Readonly<Record<string, unknown>>,
    filter: QdrantSearchArgs["filter"],
): boolean {
    if (filter === undefined) {
        return true
    }

    return filter.must.every((condition): boolean => {
        const value = getNestedValue(payload, condition.key)

        if (condition.is_null === true) {
            return value === null || value === undefined
        }

        if (condition.match === undefined) {
            return true
        }

        if ("value" in condition.match) {
            return value === condition.match.value
        }

        return condition.match.any.some((candidate): boolean => candidate === value)
    })
}

/**
 * Resolves nested payload value by dot-separated path.
 *
 * @param payload Payload record.
 * @param path Dot-separated path.
 * @returns Nested payload value.
 */
function getNestedValue(
    payload: Readonly<Record<string, unknown>>,
    path: string,
): unknown {
    let currentValue: unknown = payload

    for (const segment of path.split(".")) {
        if (isPlainObject(currentValue) === false) {
            return undefined
        }

        currentValue = currentValue[segment]
    }

    return currentValue
}

/**
 * Computes deterministic dot-product score for ranked search assertions.
 *
 * @param left Query vector.
 * @param right Stored point vector.
 * @returns Dot-product similarity score.
 */
function computeDotProduct(
    left: readonly number[],
    right: readonly number[],
): number {
    return left.reduce((sum, value, index): number => {
        return sum + value * (right[index] ?? 0)
    }, 0)
}

/**
 * Captures rejected error for assertion-friendly failure-path tests.
 *
 * @param execute Async callback expected to fail.
 * @returns Rejected error instance.
 */
async function captureRejectedError(execute: () => Promise<unknown>): Promise<Error> {
    try {
        await execute()
    } catch (error) {
        return error instanceof Error ? error : new Error(String(error))
    }

    throw new Error("Expected callback to reject")
}

/**
 * Creates vector repository with deterministic defaults.
 *
 * @param client Mock Qdrant client.
 * @returns Repository under test.
 */
function createRepository(client: IQdrantVectorClient): QdrantVectorRepository {
    return new QdrantVectorRepository({
        collectionName: "code-chunks",
        client,
    })
}

/**
 * Creates vector chunk DTO for compact test fixtures.
 *
 * @param id Stable point identifier.
 * @param vector Embedding vector.
 * @param metadata Chunk metadata payload.
 * @returns Vector chunk DTO.
 */
function createChunk(
    id: string,
    vector: readonly number[],
    metadata: Readonly<Record<string, unknown>>,
): IVectorChunkDTO {
    return {
        id,
        vector,
        metadata,
    }
}

describe("QdrantVectorRepository", () => {
    test("creates collection, keeps reindex idempotent by point id, and syncs latest metadata", async () => {
        const mock = createQdrantClientMock()
        const repository = createRepository(mock.client)

        await repository.upsert([
            createChunk("chunk-1", [1, 0], {
                repositoryId: "repo-1",
                filePath: "src/a.ts",
                reindexed: false,
            }),
        ])
        await repository.upsert([
            createChunk("chunk-1", [0.5, 0.5], {
                repositoryId: "repo-1",
                filePath: "src/a.ts",
                reindexed: true,
            }),
        ])

        const results = await repository.search([1, 0], {repositoryId: "repo-1"}, 5)

        expect(mock.state.createCollectionCalls).toHaveLength(1)
        expect(mock.state.upsertCalls).toHaveLength(2)
        expect(mock.state.pointsById.size).toBe(1)
        expect(mock.state.pointsById.get("chunk-1")?.payload).toEqual({
            repositoryId: "repo-1",
            filePath: "src/a.ts",
            reindexed: true,
        })
        expect(results).toEqual([{
            id: "chunk-1",
            score: 0.5,
            metadata: {
                repositoryId: "repo-1",
                filePath: "src/a.ts",
                reindexed: true,
            },
        }])

        await repository.delete(["chunk-1"])

        expect(mock.state.deleteCalls).toHaveLength(1)
        expect(mock.state.pointsById.size).toBe(0)
    })

    test("builds nested metadata filters and uses default search limit", async () => {
        const mock = createQdrantClientMock()
        const repository = createRepository(mock.client)

        await repository.upsert([
            createChunk("chunk-1", [1, 0], {
                repositoryId: "repo-1",
                nested: {
                    branch: "main",
                },
                priority: 2,
                archived: null,
            }),
            createChunk("chunk-2", [0.1, 0.9], {
                repositoryId: "repo-1",
                nested: {
                    branch: "feature/x",
                },
                priority: 4,
                archived: null,
            }),
        ])

        const results = await repository.search([1, 0], {
            repositoryId: "repo-1",
            nested: {
                branch: "main",
            },
            priority: [1, 2],
            archived: null,
        })

        expect(mock.state.searchCalls[0]?.limit).toBe(10)
        expect(mock.state.searchCalls[0]?.filter).toEqual({
            must: [
                {
                    key: "repositoryId",
                    match: {
                        value: "repo-1",
                    },
                },
                {
                    key: "nested.branch",
                    match: {
                        value: "main",
                    },
                },
                {
                    key: "priority",
                    match: {
                        any: [1, 2],
                    },
                },
                {
                    key: "archived",
                    is_null: true,
                },
            ],
        })
        expect(results.map((result): string => result.id)).toEqual(["chunk-1"])
    })

    test("returns empty search results and skips delete when collection is missing", async () => {
        const mock = createQdrantClientMock()
        const repository = createRepository(mock.client)

        const results = await repository.search([1, 0])
        await repository.delete(["chunk-1"])

        expect(results).toEqual([])
        expect(mock.state.getCollectionCalls).toEqual([])
        expect(mock.state.deleteCalls).toEqual([])
    })

    test("rejects invalid metadata payloads and unsupported filter values with typed errors", async () => {
        const metadataRepository = createRepository(createQdrantClientMock().client)
        const invalidMetadataError = await captureRejectedError(() => {
            return metadataRepository.upsert([
                createChunk("chunk-1", [1, 0], {
                    createdAt: new Date("2026-03-14T00:00:00.000Z"),
                }),
            ])
        })

        expect(invalidMetadataError).toBeInstanceOf(QdrantVectorRepositoryError)
        if (invalidMetadataError instanceof QdrantVectorRepositoryError) {
            expect(invalidMetadataError.code).toBe(
                QDRANT_VECTOR_REPOSITORY_ERROR_CODE.INVALID_METADATA,
            )
            expect(invalidMetadataError.fieldPath).toBe("metadata:chunk-1.createdAt")
        }

        const filterRepository = createRepository(
            createQdrantClientMock({
                initialExists: true,
                initialVectorSize: 2,
            }).client,
        )
        const invalidFilterError = await captureRejectedError(() => {
            return filterRepository.search([1, 0], {
                flags: [true],
            })
        })

        expect(invalidFilterError).toBeInstanceOf(QdrantVectorRepositoryError)
        if (invalidFilterError instanceof QdrantVectorRepositoryError) {
            expect(invalidFilterError.code).toBe(
                QDRANT_VECTOR_REPOSITORY_ERROR_CODE.UNSUPPORTED_FILTER_VALUE,
            )
            expect(invalidFilterError.fieldPath).toBe("flags")
        }
    })

    test("rejects collection vector size mismatches with typed errors", async () => {
        const repository = createRepository(
            createQdrantClientMock({
                initialExists: true,
                initialVectorSize: 3,
            }).client,
        )

        const error = await captureRejectedError(() => {
            return repository.search([1, 0])
        })

        expect(error).toBeInstanceOf(QdrantVectorRepositoryError)
        if (error instanceof QdrantVectorRepositoryError) {
            expect(error.code).toBe(
                QDRANT_VECTOR_REPOSITORY_ERROR_CODE.COLLECTION_VECTOR_SIZE_MISMATCH,
            )
            expect(error.expectedVectorSize).toBe(3)
            expect(error.actualVectorSize).toBe(2)
        }
    })

    test("wraps qdrant client failures into typed repository errors", async () => {
        const repository = createRepository(
            createQdrantClientMock({
                failCollectionExists: true,
            }).client,
        )

        const error = await captureRejectedError(() => {
            return repository.search([1, 0])
        })

        expect(error).toBeInstanceOf(QdrantVectorRepositoryError)
        if (error instanceof QdrantVectorRepositoryError) {
            expect(error.code).toBe(
                QDRANT_VECTOR_REPOSITORY_ERROR_CODE.QDRANT_REQUEST_FAILED,
            )
            expect(error.collectionName).toBe("code-chunks")
            expect(error.causeMessage).toBe("qdrant unavailable")
        }
    })
})
