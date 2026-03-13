import type {CodeChunk} from "../../../../domain/value-objects/code-chunk.value-object"
import type {Embedding} from "../../../../domain/value-objects/embedding.value-object"

/**
 * Generated embedding paired with its source code chunk.
 */
export interface ICodeChunkEmbeddingDTO {
    /**
     * Source code chunk used for embedding generation.
     */
    readonly chunk: CodeChunk

    /**
     * Generated semantic embedding for the source chunk.
     */
    readonly embedding: Embedding
}

/**
 * Outbound contract for code-chunk embedding generation.
 */
export interface ICodeChunkEmbeddingGenerator {
    /**
     * Generates semantic embeddings for source code chunks in input order.
     *
     * @param chunks Source code chunks.
     * @returns Generated embeddings paired with source chunks.
     */
    generateEmbeddings(
        chunks: readonly CodeChunk[],
    ): Promise<readonly ICodeChunkEmbeddingDTO[]>
}
