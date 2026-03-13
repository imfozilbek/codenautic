import {Embedding} from "@codenautic/core"

import type {
    CodeChunk,
    ICodeChunkEmbeddingDTO,
    ICodeChunkEmbeddingGenerator,
    ILLMProvider,
} from "@codenautic/core"

import {
    AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE,
    AstCodeChunkEmbeddingGeneratorError,
} from "./ast-code-chunk-embedding-generator.error"

const DEFAULT_BATCH_SIZE = 32

interface IEmbeddingRequestPlan {
    readonly uniqueTexts: readonly string[]
    readonly firstChunkIndexByUniqueText: readonly number[]
    readonly uniqueTextIndexByChunk: readonly number[]
}

/**
 * Constructor options for AST code-chunk embedding generator.
 */
export interface IAstCodeChunkEmbeddingGeneratorOptions {
    /**
     * Normalized LLM provider used for raw vector generation.
     */
    readonly llmProvider: ILLMProvider

    /**
     * Stable embedding model identifier attached to generated embeddings.
     */
    readonly model: string

    /**
     * Maximum number of unique chunk payloads per upstream embedding request.
     */
    readonly batchSize?: number
}

/**
 * Public AST embedding generator contract.
 */
export interface IAstCodeChunkEmbeddingGenerator extends ICodeChunkEmbeddingGenerator {}

/**
 * AST adapter that generates deterministic embeddings for code chunks.
 */
export class AstCodeChunkEmbeddingGenerator implements IAstCodeChunkEmbeddingGenerator {
    private readonly llmProvider: ILLMProvider
    private readonly model: string
    private readonly batchSize: number

    /**
     * Creates AST code-chunk embedding generator.
     *
     * @param options Generator dependencies and configuration.
     */
    public constructor(options: IAstCodeChunkEmbeddingGeneratorOptions) {
        this.llmProvider = options.llmProvider
        this.model = normalizeModel(options.model)
        this.batchSize = normalizeBatchSize(options.batchSize)
    }

    /**
     * Generates embeddings for code chunks in stable input order.
     *
     * @param chunks Source code chunks.
     * @returns Generated embeddings paired with source chunks.
     */
    public async generateEmbeddings(
        chunks: readonly CodeChunk[],
    ): Promise<readonly ICodeChunkEmbeddingDTO[]> {
        if (chunks.length === 0) {
            return []
        }

        const plan = createEmbeddingRequestPlan(chunks)
        const uniqueEmbeddings = await this.generateUniqueEmbeddings(plan)

        return chunks.map((chunk, chunkIndex): ICodeChunkEmbeddingDTO => {
            return {
                chunk,
                embedding: resolveChunkEmbedding(
                    uniqueEmbeddings,
                    plan.uniqueTextIndexByChunk,
                    chunkIndex,
                ),
            }
        })
    }

    /**
     * Generates embeddings for unique chunk payloads in deterministic batches.
     *
     * @param plan Deduplicated embedding request plan.
     * @returns Embeddings for unique chunk payloads.
     */
    private async generateUniqueEmbeddings(
        plan: IEmbeddingRequestPlan,
    ): Promise<readonly Embedding[]> {
        const uniqueEmbeddings: Embedding[] = []

        for (
            let batchStartIndex = 0;
            batchStartIndex < plan.uniqueTexts.length;
            batchStartIndex += this.batchSize
        ) {
            const batchTexts = plan.uniqueTexts.slice(
                batchStartIndex,
                batchStartIndex + this.batchSize,
            )
            const batchEmbeddings = await this.generateBatchEmbeddings(
                batchTexts,
                batchStartIndex,
                plan.firstChunkIndexByUniqueText,
            )

            uniqueEmbeddings.push(...batchEmbeddings)
        }

        return uniqueEmbeddings
    }

    /**
     * Generates one batch of embeddings and validates upstream response shape.
     *
     * @param batchTexts Unique embedding payloads for one upstream request.
     * @param batchStartIndex Global unique-text offset.
     * @param firstChunkIndexByUniqueText First source chunk index for each unique text.
     * @returns Validated embeddings for the current batch.
     */
    private async generateBatchEmbeddings(
        batchTexts: readonly string[],
        batchStartIndex: number,
        firstChunkIndexByUniqueText: readonly number[],
    ): Promise<readonly Embedding[]> {
        const vectors = await this.requestEmbeddingVectors(batchTexts)
        validateEmbeddingCount(batchTexts.length, vectors.length)

        return vectors.map((vector, batchOffset): Embedding => {
            const chunkIndex = firstChunkIndexByUniqueText[batchStartIndex + batchOffset]

            return createValidatedEmbedding(vector, this.model, chunkIndex)
        })
    }

    /**
     * Requests raw embedding vectors from the normalized LLM provider.
     *
     * @param texts Embedding payloads for one batch.
     * @returns Raw embedding vectors from provider.
     */
    private async requestEmbeddingVectors(
        texts: readonly string[],
    ): Promise<readonly (readonly number[])[]> {
        try {
            return await this.llmProvider.embed(texts)
        } catch (error) {
            throw new AstCodeChunkEmbeddingGeneratorError(
                AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE.EMBEDDING_PROVIDER_FAILED,
                {
                    model: this.model,
                    causeMessage: error instanceof Error ? error.message : String(error),
                },
            )
        }
    }
}

/**
 * Builds deterministic deduplicated request plan for chunk embeddings.
 *
 * @param chunks Source code chunks.
 * @returns Deduplicated request plan.
 */
function createEmbeddingRequestPlan(
    chunks: readonly CodeChunk[],
): IEmbeddingRequestPlan {
    const uniqueTexts: string[] = []
    const firstChunkIndexByUniqueText: number[] = []
    const uniqueTextIndexByChunk: number[] = []
    const uniqueTextIndexBySerializedChunk = new Map<string, number>()

    for (const [chunkIndex, chunk] of chunks.entries()) {
        const serializedChunk = serializeChunkForEmbedding(chunk)
        const existingUniqueTextIndex = uniqueTextIndexBySerializedChunk.get(serializedChunk)

        if (existingUniqueTextIndex !== undefined) {
            uniqueTextIndexByChunk.push(existingUniqueTextIndex)
            continue
        }

        const uniqueTextIndex = uniqueTexts.length

        uniqueTexts.push(serializedChunk)
        firstChunkIndexByUniqueText.push(chunkIndex)
        uniqueTextIndexByChunk.push(uniqueTextIndex)
        uniqueTextIndexBySerializedChunk.set(serializedChunk, uniqueTextIndex)
    }

    return {
        uniqueTexts,
        firstChunkIndexByUniqueText,
        uniqueTextIndexByChunk,
    }
}

/**
 * Serializes chunk into deterministic embedding payload.
 *
 * @param chunk Source code chunk.
 * @returns Stable payload sent to embedding backend.
 */
function serializeChunkForEmbedding(chunk: CodeChunk): string {
    return chunk.content
}

/**
 * Resolves generated embedding for source chunk index.
 *
 * @param uniqueEmbeddings Embeddings generated for unique chunk payloads.
 * @param uniqueTextIndexByChunk Unique-text index for every source chunk.
 * @param chunkIndex Source chunk index.
 * @returns Generated embedding for source chunk.
 */
function resolveChunkEmbedding(
    uniqueEmbeddings: readonly Embedding[],
    uniqueTextIndexByChunk: readonly number[],
    chunkIndex: number,
): Embedding {
    const uniqueTextIndex = uniqueTextIndexByChunk[chunkIndex]
    const embedding = uniqueTextIndex === undefined
        ? undefined
        : uniqueEmbeddings[uniqueTextIndex]

    if (embedding !== undefined) {
        return embedding
    }

    throw new AstCodeChunkEmbeddingGeneratorError(
        AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE.EMBEDDING_COUNT_MISMATCH,
        {
            expectedCount: uniqueTextIndexByChunk.length,
            receivedCount: uniqueEmbeddings.length,
        },
    )
}

/**
 * Validates raw embedding vector and creates immutable embedding value object.
 *
 * @param vector Raw embedding vector.
 * @param model Stable embedding model identifier.
 * @param chunkIndex Source chunk index associated with the vector.
 * @returns Validated immutable embedding value object.
 */
function createValidatedEmbedding(
    vector: readonly number[],
    model: string,
    chunkIndex: number | undefined,
): Embedding {
    validateEmbeddingVector(vector, chunkIndex)

    return Embedding.create({
        vector,
        dimensions: vector.length,
        model,
    })
}

/**
 * Validates provider response count for one embedding batch.
 *
 * @param expectedCount Expected number of vectors.
 * @param receivedCount Received number of vectors.
 * @returns Nothing.
 */
function validateEmbeddingCount(expectedCount: number, receivedCount: number): void {
    if (expectedCount === receivedCount) {
        return
    }

    throw new AstCodeChunkEmbeddingGeneratorError(
        AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE.EMBEDDING_COUNT_MISMATCH,
        {
            expectedCount,
            receivedCount,
        },
    )
}

/**
 * Validates raw embedding vector shape.
 *
 * @param vector Raw embedding vector.
 * @param chunkIndex Source chunk index associated with the vector.
 * @returns Nothing.
 */
function validateEmbeddingVector(
    vector: readonly number[],
    chunkIndex: number | undefined,
): void {
    if (vector.length === 0) {
        throw new AstCodeChunkEmbeddingGeneratorError(
            AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE.INVALID_EMBEDDING_VECTOR,
            {
                chunkIndex,
            },
        )
    }

    for (const value of vector) {
        if (Number.isFinite(value) === false) {
            throw new AstCodeChunkEmbeddingGeneratorError(
                AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE.INVALID_EMBEDDING_VECTOR,
                {
                    chunkIndex,
                },
            )
        }
    }
}

/**
 * Normalizes embedding model identifier.
 *
 * @param model Raw embedding model.
 * @returns Normalized model identifier.
 */
function normalizeModel(model: string): string {
    const normalizedModel = model.trim()

    if (normalizedModel.length > 0) {
        return normalizedModel
    }

    throw new AstCodeChunkEmbeddingGeneratorError(
        AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE.INVALID_MODEL,
        {
            model,
        },
    )
}

/**
 * Normalizes maximum embedding batch size.
 *
 * @param batchSize Raw batch size.
 * @returns Normalized positive integer batch size.
 */
function normalizeBatchSize(batchSize: number | undefined): number {
    if (batchSize === undefined) {
        return DEFAULT_BATCH_SIZE
    }

    if (Number.isInteger(batchSize) && batchSize > 0) {
        return batchSize
    }

    throw new AstCodeChunkEmbeddingGeneratorError(
        AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE.INVALID_BATCH_SIZE,
        {
            batchSize,
        },
    )
}
