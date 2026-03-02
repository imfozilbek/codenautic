import {DomainError} from "./domain.error"

/**
 * Error returned when review aggregate is missing in repository.
 */
export class ReviewNotFoundError extends DomainError {
    public readonly code = "REVIEW_NOT_FOUND"

    /**
     * Creates missing review error.
     *
     * @param reviewId Missing review identifier.
     */
    public constructor(reviewId: string) {
        super(`Review '${reviewId}' was not found`)
    }
}
