import {DomainError} from "./domain.error"

/**
 * Domain error raised when operation hits a business conflict.
 */
export class ConflictError extends DomainError {
    public readonly code = "CONFLICT"
    public readonly conflictReason: string

    /**
     * Creates conflict error.
     *
     * @param conflictReason Conflict reason description.
     * @param cause Optional upstream error cause.
     */
    public constructor(conflictReason: string, cause?: Error) {
        super(`Conflict detected: ${conflictReason}`, cause)
        this.conflictReason = conflictReason
    }
}
