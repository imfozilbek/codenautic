import {DomainError} from "./domain.error"

/**
 * Error raised when consumed severity exceeds aggregate budget.
 */
export class ReviewSeverityBudgetExceededError extends DomainError {
    /**
     * Creates severity budget error.
     *
     * @param consumedSeverity Requested consumed severity.
     * @param budget Allowed severity budget.
     */
    public constructor(consumedSeverity: number, budget: number) {
        super(
            "REVIEW_SEVERITY_BUDGET_EXCEEDED",
            `Consumed severity '${consumedSeverity}' exceeds budget '${budget}'`,
        )
    }
}
