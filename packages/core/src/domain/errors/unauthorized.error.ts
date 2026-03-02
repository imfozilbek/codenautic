import {DomainError} from "./domain.error"

/**
 * Domain error raised when actor lacks required permission.
 */
export class UnauthorizedError extends DomainError {
    public readonly code = "UNAUTHORIZED"
    public readonly requiredPermission?: string

    /**
     * Creates unauthorized error.
     *
     * @param requiredPermission Optional permission needed for operation.
     * @param cause Optional upstream error cause.
     */
    public constructor(requiredPermission?: string, cause?: Error) {
        const message =
            requiredPermission === undefined
                ? "Operation is not authorized"
                : `Operation requires permission '${requiredPermission}'`
        super(message, cause)
        this.requiredPermission = requiredPermission
    }
}
