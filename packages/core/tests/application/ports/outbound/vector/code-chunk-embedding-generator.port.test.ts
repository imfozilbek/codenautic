import {describe, expect, test} from "bun:test"

import {
    CodeChunk,
    Embedding,
    FilePath,
    LineRange,
    type ICodeChunkEmbeddingDTO,
    type ICodeChunkEmbeddingGenerator,
} from "../../../../../src"

class InMemoryCodeChunkEmbeddingGenerator implements ICodeChunkEmbeddingGenerator {
    public generateEmbeddings(
        chunks: readonly CodeChunk[],
    ): Promise<readonly ICodeChunkEmbeddingDTO[]> {
        return Promise.resolve(
            chunks.map((chunk, index): ICodeChunkEmbeddingDTO => {
                return {
                    chunk,
                    embedding: Embedding.create({
                        vector: [index + 1, index + 2],
                        dimensions: 2,
                        model: "test-embedding-model",
                    }),
                }
            }),
        )
    }
}

describe("ICodeChunkEmbeddingGenerator contract", () => {
    test("pairs generated embeddings with source chunks in input order", async () => {
        const generator = new InMemoryCodeChunkEmbeddingGenerator()
        const chunks = [
            createChunk("src/a.ts", 1, 3, "typescript", "export const a = 1"),
            createChunk("src/b.ts", 10, 14, "typescript", "export const b = a + 1"),
        ]

        const result = await generator.generateEmbeddings(chunks)

        expect(result).toHaveLength(2)
        expect(result[0]?.chunk).toBe(chunks[0])
        expect(result[1]?.chunk).toBe(chunks[1])
        expect(result[0]?.embedding.vector).toEqual([1, 2])
        expect(result[1]?.embedding.model).toBe("test-embedding-model")
    })

    test("returns empty list when no chunks were provided", async () => {
        const generator = new InMemoryCodeChunkEmbeddingGenerator()

        const result = await generator.generateEmbeddings([])

        expect(result).toEqual([])
    })
})

/**
 * Creates code chunk fixture for embedding-generator contract tests.
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
