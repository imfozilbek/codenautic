import {DomainError} from "./domain.error"

/**
 * Error returned when review aggregate is missing in repository.
 */
export class ReviewNotFoundError extends DomainError {
    /**
     * Creates missing review error.
     *
     * @param reviewId Missing review identifier.
     */
    public constructor(reviewId: string) {
        super("REVIEW_NOT_FOUND", `Review '${reviewId}' was not found`)
    }
}
