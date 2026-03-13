/**
 * Typed error codes for AST code-chunk embedding generation failures.
 */
export const AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE = {
    INVALID_MODEL: "INVALID_MODEL",
    INVALID_BATCH_SIZE: "INVALID_BATCH_SIZE",
    EMBEDDING_PROVIDER_FAILED: "EMBEDDING_PROVIDER_FAILED",
    EMBEDDING_COUNT_MISMATCH: "EMBEDDING_COUNT_MISMATCH",
    INVALID_EMBEDDING_VECTOR: "INVALID_EMBEDDING_VECTOR",
} as const

/**
 * AST code-chunk embedding generator error code literal.
 */
export type AstCodeChunkEmbeddingGeneratorErrorCode =
    (typeof AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE)[keyof typeof AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE]

/**
 * Structured metadata for AST code-chunk embedding generator failures.
 */
export interface IAstCodeChunkEmbeddingGeneratorErrorDetails {
    /**
     * Embedding model involved in the failure when available.
     */
    readonly model?: string

    /**
     * Batch size involved in the failure when available.
     */
    readonly batchSize?: number

    /**
     * Source chunk index involved in the failure when available.
     */
    readonly chunkIndex?: number

    /**
     * Expected number of embeddings when counts mismatch.
     */
    readonly expectedCount?: number

    /**
     * Received number of embeddings when counts mismatch.
     */
    readonly receivedCount?: number

    /**
     * Root cause message from lower-level dependency.
     */
    readonly causeMessage?: string
}

/**
 * Typed AST code-chunk embedding generator error with stable public metadata.
 */
export class AstCodeChunkEmbeddingGeneratorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstCodeChunkEmbeddingGeneratorErrorCode

    /**
     * Embedding model involved in the failure when available.
     */
    public readonly model?: string

    /**
     * Batch size involved in the failure when available.
     */
    public readonly batchSize?: number

    /**
     * Source chunk index involved in the failure when available.
     */
    public readonly chunkIndex?: number

    /**
     * Expected number of embeddings when counts mismatch.
     */
    public readonly expectedCount?: number

    /**
     * Received number of embeddings when counts mismatch.
     */
    public readonly receivedCount?: number

    /**
     * Root cause message from lower-level dependency.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed generator error with stable public message.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstCodeChunkEmbeddingGeneratorErrorCode,
        details: IAstCodeChunkEmbeddingGeneratorErrorDetails = {},
    ) {
        super(createAstCodeChunkEmbeddingGeneratorErrorMessage(code, details))

        this.name = "AstCodeChunkEmbeddingGeneratorError"
        this.code = code
        this.model = details.model
        this.batchSize = details.batchSize
        this.chunkIndex = details.chunkIndex
        this.expectedCount = details.expectedCount
        this.receivedCount = details.receivedCount
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public error message for AST code-chunk embedding generation failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public error message.
 */
function createAstCodeChunkEmbeddingGeneratorErrorMessage(
    code: AstCodeChunkEmbeddingGeneratorErrorCode,
    details: IAstCodeChunkEmbeddingGeneratorErrorDetails,
): string {
    return AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_MESSAGE_BUILDERS[code](details)
}

const AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_MESSAGE_BUILDERS: Record<
    AstCodeChunkEmbeddingGeneratorErrorCode,
    (details: IAstCodeChunkEmbeddingGeneratorErrorDetails) => string
> = {
    INVALID_MODEL: (details: IAstCodeChunkEmbeddingGeneratorErrorDetails): string => {
        return `Invalid embedding model for AST code chunk embedding generator: ${details.model ?? "<empty>"}`
    },
    INVALID_BATCH_SIZE: (details: IAstCodeChunkEmbeddingGeneratorErrorDetails): string => {
        return `Invalid batch size for AST code chunk embedding generator: ${String(details.batchSize ?? "<empty>")}`
    },
    EMBEDDING_PROVIDER_FAILED: (
        details: IAstCodeChunkEmbeddingGeneratorErrorDetails,
    ): string => {
        return `Embedding provider failed for AST code chunk embedding generator: ${details.causeMessage ?? "<unknown>"}` 
    },
    EMBEDDING_COUNT_MISMATCH: (
        details: IAstCodeChunkEmbeddingGeneratorErrorDetails,
    ): string => {
        return `Embedding count mismatch for AST code chunk embedding generator: expected ${String(details.expectedCount ?? "<unknown>")}, received ${String(details.receivedCount ?? "<unknown>")}`
    },
    INVALID_EMBEDDING_VECTOR: (
        details: IAstCodeChunkEmbeddingGeneratorErrorDetails,
    ): string => {
        return `Invalid embedding vector for AST code chunk embedding generator at chunk index ${String(details.chunkIndex ?? "<unknown>")}`
    },
}
