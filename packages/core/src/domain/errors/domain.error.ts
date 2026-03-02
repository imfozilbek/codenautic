/**
 * Base class for all domain-level errors.
 */
export abstract class DomainError extends Error {
    public abstract readonly code: string

    /**
     * Creates domain error instance.
     *
     * @param message Human-readable description.
     */
    public constructor(message: string) {
        super(message)
        this.name = new.target.name
    }
}
