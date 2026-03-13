import {describe, expect, test} from "bun:test"

import {
    CodeChunk,
    FilePath,
    LineRange,
    type IChatRequestDTO,
    type IChatResponseDTO,
    type IChatChunkDTO,
    type ILLMProvider,
} from "@codenautic/core"

import {
    AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE,
    AstCodeChunkEmbeddingGenerator,
    AstCodeChunkEmbeddingGeneratorError,
    type IAstCodeChunkEmbeddingGeneratorOptions,
} from "../../src/ast"

interface ILlmProviderMockOverrides {
    readonly embed?: (texts: readonly string[]) => Promise<readonly number[][]>
}

/**
 * Creates deterministic LLM provider mock for AST embedding generator tests.
 *
 * @param overrides Partial mock overrides.
 * @returns Shared LLM provider mock.
 */
function createLlmProviderMock(overrides: ILlmProviderMockOverrides): ILLMProvider {
    return {
        chat(_request: IChatRequestDTO): Promise<IChatResponseDTO> {
            return Promise.reject(new Error("Unexpected chat request"))
        },
        stream(_request: IChatRequestDTO): AsyncIterable<IChatChunkDTO> {
            return {
                [Symbol.asyncIterator](): AsyncIterator<IChatChunkDTO> {
                    return {
                        next(): Promise<IteratorResult<IChatChunkDTO>> {
                            return Promise.resolve({
                                done: true,
                                value: undefined,
                            })
                        },
                    }
                },
            }
        },
        embed(texts: readonly string[]): Promise<readonly number[][]> {
            const embed = overrides.embed

            if (embed !== undefined) {
                return embed(texts)
            }

            return Promise.reject(new Error("Unexpected embed request"))
        },
    }
}

/**
 * Captures rejected error for assertion-friendly tests.
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

describe("AstCodeChunkEmbeddingGenerator", () => {
    test("generates embeddings for code chunks in stable input order", async () => {
        const providerCalls: Array<readonly string[]> = []
        const generator = createGenerator({
            embed(texts: readonly string[]): Promise<readonly number[][]> {
                providerCalls.push(texts)

                return Promise.resolve([
                    [0.1, 0.2, 0.3],
                    [0.4, 0.5, 0.6],
                ])
            },
        })
        const chunks = [
            createChunk("src/a.ts", 1, 3, "typescript", "export const a = 1"),
            createChunk("src/b.ts", 10, 12, "typescript", "export const b = a + 1"),
        ]

        const result = await generator.generateEmbeddings(chunks)

        expect(providerCalls).toEqual([[
            "export const a = 1",
            "export const b = a + 1",
        ]])
        expect(result).toHaveLength(2)
        expect(result[0]?.chunk).toBe(chunks[0])
        expect(result[1]?.chunk).toBe(chunks[1])
        expect(result[0]?.embedding.vector).toEqual([0.1, 0.2, 0.3])
        expect(result[1]?.embedding.model).toBe("text-embedding-3-small")
    })

    test("deduplicates identical chunk payloads and batches unique requests deterministically", async () => {
        const providerCalls: Array<readonly string[]> = []
        const generator = createGenerator(
            {
                embed(texts: readonly string[]): Promise<readonly number[][]> {
                    providerCalls.push(texts)

                    if (providerCalls.length === 1) {
                        return Promise.resolve([
                            [1, 1],
                            [2, 2],
                        ])
                    }

                    return Promise.resolve([[3, 3]])
                },
            },
            {
                batchSize: 2,
            },
        )
        const chunks = [
            createChunk("src/a.ts", 1, 2, "typescript", "const shared = 1"),
            createChunk("src/b.ts", 5, 6, "typescript", "const shared = 1"),
            createChunk("src/c.ts", 10, 11, "typescript", "const uniqueB = 2"),
            createChunk("src/d.ts", 15, 16, "typescript", "const uniqueC = 3"),
        ]

        const result = await generator.generateEmbeddings(chunks)

        expect(providerCalls).toEqual([
            ["const shared = 1", "const uniqueB = 2"],
            ["const uniqueC = 3"],
        ])
        expect(result[0]?.embedding.vector).toEqual([1, 1])
        expect(result[1]?.embedding.vector).toEqual([1, 1])
        expect(result[2]?.embedding.vector).toEqual([2, 2])
        expect(result[3]?.embedding.vector).toEqual([3, 3])
    })

    test("returns empty result without provider calls for empty input", async () => {
        let embedCallCount = 0
        const generator = createGenerator({
            embed(_texts: readonly string[]): Promise<readonly number[][]> {
                embedCallCount += 1
                return Promise.resolve([])
            },
        })

        const result = await generator.generateEmbeddings([])

        expect(result).toEqual([])
        expect(embedCallCount).toBe(0)
    })

    test("wraps provider failures into typed generator errors", async () => {
        const generator = createGenerator({
            embed(_texts: readonly string[]): Promise<readonly number[][]> {
                return Promise.reject(new Error("rate limited"))
            },
        })

        const error = await captureRejectedError(() => {
            return generator.generateEmbeddings([
                createChunk("src/a.ts", 1, 1, "typescript", "const a = 1"),
            ])
        })

        expect(error).toBeInstanceOf(AstCodeChunkEmbeddingGeneratorError)
        if (error instanceof AstCodeChunkEmbeddingGeneratorError) {
            expect(error.code).toBe(
                AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE.EMBEDDING_PROVIDER_FAILED,
            )
            expect(error.causeMessage).toBe("rate limited")
        }
    })

    test("rejects provider responses with mismatched embedding counts", async () => {
        const generator = createGenerator({
            embed(_texts: readonly string[]): Promise<readonly number[][]> {
                return Promise.resolve([[0.1, 0.2]])
            },
        })

        const error = await captureRejectedError(() => {
            return generator.generateEmbeddings([
                createChunk("src/a.ts", 1, 1, "typescript", "const a = 1"),
                createChunk("src/b.ts", 2, 2, "typescript", "const b = 2"),
            ])
        })

        expect(error).toBeInstanceOf(AstCodeChunkEmbeddingGeneratorError)
        if (error instanceof AstCodeChunkEmbeddingGeneratorError) {
            expect(error.code).toBe(
                AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE.EMBEDDING_COUNT_MISMATCH,
            )
            expect(error.expectedCount).toBe(2)
            expect(error.receivedCount).toBe(1)
        }
    })

    test("rejects invalid embedding vectors and constructor config with typed errors", async () => {
        const generator = createGenerator({
            embed(_texts: readonly string[]): Promise<readonly number[][]> {
                return Promise.resolve([[Number.NaN, 1]])
            },
        })
        const invalidVectorError = await captureRejectedError(() => {
            return generator.generateEmbeddings([
                createChunk("src/a.ts", 1, 1, "typescript", "const a = 1"),
            ])
        })

        expect(invalidVectorError).toBeInstanceOf(AstCodeChunkEmbeddingGeneratorError)
        if (invalidVectorError instanceof AstCodeChunkEmbeddingGeneratorError) {
            expect(invalidVectorError.code).toBe(
                AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE.INVALID_EMBEDDING_VECTOR,
            )
            expect(invalidVectorError.chunkIndex).toBe(0)
        }

        expect(() => {
            return createGenerator(
                {
                    embed(_texts: readonly string[]): Promise<readonly number[][]> {
                        return Promise.resolve([])
                    },
                },
                {
                    model: "   ",
                },
            )
        }).toThrow(AstCodeChunkEmbeddingGeneratorError)
        expect(() => {
            return createGenerator(
                {
                    embed(_texts: readonly string[]): Promise<readonly number[][]> {
                        return Promise.resolve([])
                    },
                },
                {
                    batchSize: 0,
                },
            )
        }).toThrow(AstCodeChunkEmbeddingGeneratorError)
    })
})

/**
 * Creates code chunk fixture for AST embedding generator tests.
 *
 * @param filePath Repository-relative file path.
 * @param start Start line.
 * @param end End line.
 * @param language Chunk language.
 * @param content Raw chunk content.
 * @returns Code chunk fixture.
 */
function createChunk(
    filePath: string,
    start: number,
    end: number,
    language: string,
    content: string,
): CodeChunk {
    return CodeChunk.create({
        content,
        filePath: FilePath.create(filePath),
        lineRange: LineRange.create(start, end),
        language,
    })
}

/**
 * Creates AST embedding generator with deterministic defaults.
 *
 * @param overrides Partial LLM provider overrides.
 * @param options Partial generator options.
 * @returns AST embedding generator.
 */
function createGenerator(
    overrides: ILlmProviderMockOverrides,
    options: Partial<
        Omit<IAstCodeChunkEmbeddingGeneratorOptions, "llmProvider">
    > = {},
): AstCodeChunkEmbeddingGenerator {
    return new AstCodeChunkEmbeddingGenerator({
        llmProvider: createLlmProviderMock(overrides),
        model: options.model ?? "text-embedding-3-small",
        batchSize: options.batchSize,
    })
}
