import {DomainError} from "./domain.error"

/**
 * Error raised when review lifecycle transition is not allowed.
 */
export class ReviewStatusTransitionError extends DomainError {
    /**
     * Creates transition error.
     *
     * @param currentStatus Current review status.
     * @param attemptedOperation Lifecycle operation name.
     */
    public constructor(currentStatus: string, attemptedOperation: string) {
        super(
            "REVIEW_STATUS_TRANSITION_FORBIDDEN",
            `Cannot '${attemptedOperation}' review from status '${currentStatus}'`,
        )
    }
}
