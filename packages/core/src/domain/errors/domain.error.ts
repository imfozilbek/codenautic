/**
 * Base class for all domain-level errors.
 */
export class DomainError extends Error {
    public readonly code: string

    /**
     * Creates domain error instance.
     *
     * @param code Stable domain error code.
     * @param message Human-readable description.
     */
    public constructor(code: string, message: string) {
        super(message)
        this.name = new.target.name
        this.code = code
    }
}
