/**
 * Base class for all domain-level errors.
 */
export abstract class DomainError extends Error {
    public abstract readonly code: string
    public readonly timestamp: Date
    public readonly cause?: Error

    /**
     * Creates domain error instance.
     *
     * @param message Human-readable description.
     * @param cause Optional upstream error cause.
     */
    public constructor(message: string, cause?: Error) {
        super(message)
        this.name = new.target.name
        this.timestamp = new Date()
        this.cause = cause
    }

    /**
     * Serializes domain error into stable transport shape.
     *
     * @returns Serializable error payload.
     */
    public serialize(): {
        readonly code: string
        readonly message: string
        readonly timestamp: Date
        readonly cause?: string
    } {
        if (this.cause === undefined) {
            return {
                code: this.code,
                message: this.message,
                timestamp: new Date(this.timestamp),
            }
        }

        return {
            code: this.code,
            message: this.message,
            timestamp: new Date(this.timestamp),
            cause: this.cause.message,
        }
    }
}
