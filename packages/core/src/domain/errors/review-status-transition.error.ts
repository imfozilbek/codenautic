import {DomainError} from "./domain.error"

/**
 * Error raised when review lifecycle transition is not allowed.
 */
export class ReviewStatusTransitionError extends DomainError {
    public readonly code = "REVIEW_STATUS_TRANSITION_FORBIDDEN"

    /**
     * Creates transition error.
     *
     * @param currentStatus Current review status.
     * @param attemptedOperation Lifecycle operation name.
     */
    public constructor(currentStatus: string, attemptedOperation: string) {
        super(`Cannot '${attemptedOperation}' review from status '${currentStatus}'`)
    }
}
