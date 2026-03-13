/**
 * Typed error codes for Qdrant vector repository failures.
 */
export const QDRANT_VECTOR_REPOSITORY_ERROR_CODE = {
    INVALID_COLLECTION_NAME: "INVALID_COLLECTION_NAME",
    INVALID_DISTANCE: "INVALID_DISTANCE",
    INVALID_VECTOR_SIZE: "INVALID_VECTOR_SIZE",
    INVALID_VECTOR_ID: "INVALID_VECTOR_ID",
    INVALID_VECTOR: "INVALID_VECTOR",
    INVALID_LIMIT: "INVALID_LIMIT",
    INVALID_METADATA: "INVALID_METADATA",
    INVALID_FILTER_KEY: "INVALID_FILTER_KEY",
    UNSUPPORTED_FILTER_VALUE: "UNSUPPORTED_FILTER_VALUE",
    COLLECTION_VECTOR_SIZE_MISMATCH: "COLLECTION_VECTOR_SIZE_MISMATCH",
    UNSUPPORTED_COLLECTION_VECTOR_CONFIG: "UNSUPPORTED_COLLECTION_VECTOR_CONFIG",
    QDRANT_REQUEST_FAILED: "QDRANT_REQUEST_FAILED",
} as const

/**
 * Qdrant vector repository error code literal.
 */
export type QdrantVectorRepositoryErrorCode =
    (typeof QDRANT_VECTOR_REPOSITORY_ERROR_CODE)[keyof typeof QDRANT_VECTOR_REPOSITORY_ERROR_CODE]

/**
 * Structured metadata for Qdrant vector repository failures.
 */
export interface IQdrantVectorRepositoryErrorDetails {
    /**
     * Collection name involved in the failure when available.
     */
    readonly collectionName?: string

    /**
     * Distance metric involved in the failure when available.
     */
    readonly distance?: string

    /**
     * Vector size involved in the failure when available.
     */
    readonly vectorSize?: number

    /**
     * Vector identifier involved in the failure when available.
     */
    readonly vectorId?: string

    /**
     * Search limit involved in the failure when available.
     */
    readonly limit?: number

    /**
     * Metadata or filter path involved in the failure when available.
     */
    readonly fieldPath?: string

    /**
     * Expected vector size when mismatch occurs.
     */
    readonly expectedVectorSize?: number

    /**
     * Actual vector size when mismatch occurs.
     */
    readonly actualVectorSize?: number

    /**
     * Root cause message from lower-level dependency.
     */
    readonly causeMessage?: string
}

/**
 * Typed Qdrant vector repository error with stable public metadata.
 */
export class QdrantVectorRepositoryError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: QdrantVectorRepositoryErrorCode

    /**
     * Collection name involved in the failure when available.
     */
    public readonly collectionName?: string

    /**
     * Distance metric involved in the failure when available.
     */
    public readonly distance?: string

    /**
     * Vector size involved in the failure when available.
     */
    public readonly vectorSize?: number

    /**
     * Vector identifier involved in the failure when available.
     */
    public readonly vectorId?: string

    /**
     * Search limit involved in the failure when available.
     */
    public readonly limit?: number

    /**
     * Metadata or filter path involved in the failure when available.
     */
    public readonly fieldPath?: string

    /**
     * Expected vector size when mismatch occurs.
     */
    public readonly expectedVectorSize?: number

    /**
     * Actual vector size when mismatch occurs.
     */
    public readonly actualVectorSize?: number

    /**
     * Root cause message from lower-level dependency.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed repository error with stable public message.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: QdrantVectorRepositoryErrorCode,
        details: IQdrantVectorRepositoryErrorDetails = {},
    ) {
        super(createQdrantVectorRepositoryErrorMessage(code, details))

        this.name = "QdrantVectorRepositoryError"
        this.code = code
        this.collectionName = details.collectionName
        this.distance = details.distance
        this.vectorSize = details.vectorSize
        this.vectorId = details.vectorId
        this.limit = details.limit
        this.fieldPath = details.fieldPath
        this.expectedVectorSize = details.expectedVectorSize
        this.actualVectorSize = details.actualVectorSize
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public error message for Qdrant vector repository failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public error message.
 */
function createQdrantVectorRepositoryErrorMessage(
    code: QdrantVectorRepositoryErrorCode,
    details: IQdrantVectorRepositoryErrorDetails,
): string {
    return QDRANT_VECTOR_REPOSITORY_ERROR_MESSAGE_BUILDERS[code](details)
}

const QDRANT_VECTOR_REPOSITORY_ERROR_MESSAGE_BUILDERS: Record<
    QdrantVectorRepositoryErrorCode,
    (details: IQdrantVectorRepositoryErrorDetails) => string
> = {
    INVALID_COLLECTION_NAME: (details: IQdrantVectorRepositoryErrorDetails): string => {
        return `Invalid Qdrant collection name: ${details.collectionName ?? "<empty>"}`
    },
    INVALID_DISTANCE: (details: IQdrantVectorRepositoryErrorDetails): string => {
        return `Invalid Qdrant distance metric: ${details.distance ?? "<empty>"}`
    },
    INVALID_VECTOR_SIZE: (details: IQdrantVectorRepositoryErrorDetails): string => {
        return `Invalid Qdrant vector size: ${String(details.vectorSize ?? "<empty>")}`
    },
    INVALID_VECTOR_ID: (details: IQdrantVectorRepositoryErrorDetails): string => {
        return `Invalid Qdrant vector id: ${details.vectorId ?? "<empty>"}`
    },
    INVALID_VECTOR: (details: IQdrantVectorRepositoryErrorDetails): string => {
        return `Invalid Qdrant vector payload at ${details.fieldPath ?? "<unknown>"}`
    },
    INVALID_LIMIT: (details: IQdrantVectorRepositoryErrorDetails): string => {
        return `Invalid Qdrant search limit: ${String(details.limit ?? "<empty>")}`
    },
    INVALID_METADATA: (details: IQdrantVectorRepositoryErrorDetails): string => {
        return `Invalid Qdrant metadata payload at ${details.fieldPath ?? "<unknown>"}`
    },
    INVALID_FILTER_KEY: (details: IQdrantVectorRepositoryErrorDetails): string => {
        return `Invalid Qdrant filter key at ${details.fieldPath ?? "<unknown>"}`
    },
    UNSUPPORTED_FILTER_VALUE: (details: IQdrantVectorRepositoryErrorDetails): string => {
        return `Unsupported Qdrant filter value at ${details.fieldPath ?? "<unknown>"}`
    },
    COLLECTION_VECTOR_SIZE_MISMATCH: (
        details: IQdrantVectorRepositoryErrorDetails,
    ): string => {
        return `Qdrant collection vector size mismatch: expected ${String(details.expectedVectorSize ?? "<unknown>")}, received ${String(details.actualVectorSize ?? "<unknown>")}`
    },
    UNSUPPORTED_COLLECTION_VECTOR_CONFIG: (
        details: IQdrantVectorRepositoryErrorDetails,
    ): string => {
        return `Unsupported Qdrant collection vector configuration for ${details.collectionName ?? "<unknown>"}`
    },
    QDRANT_REQUEST_FAILED: (details: IQdrantVectorRepositoryErrorDetails): string => {
        return `Qdrant request failed for ${details.collectionName ?? "<unknown>"}: ${details.causeMessage ?? "<unknown>"}`
    },
}
