import {DomainError} from "./domain.error"

/**
 * Domain error raised when entity is missing.
 */
export class NotFoundError extends DomainError {
    public readonly code = "NOT_FOUND"
    public readonly entityType: string
    public readonly entityId: string

    /**
     * Creates not-found error.
     *
     * @param entityType Missing entity type.
     * @param entityId Missing entity id.
     * @param cause Optional upstream error cause.
     */
    public constructor(entityType: string, entityId: string, cause?: Error) {
        super(`${entityType} with id ${entityId} not found`, cause)
        this.entityType = entityType
        this.entityId = entityId
    }
}
