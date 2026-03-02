import {DomainError} from "./domain.error"

/**
 * Error raised when consumed severity exceeds aggregate budget.
 */
export class ReviewSeverityBudgetExceededError extends DomainError {
    public readonly code = "REVIEW_SEVERITY_BUDGET_EXCEEDED"

    /**
     * Creates severity budget error.
     *
     * @param consumedSeverity Requested consumed severity.
     * @param budget Allowed severity budget.
     */
    public constructor(consumedSeverity: number, budget: number) {
        super(`Consumed severity '${consumedSeverity}' exceeds budget '${budget}'`)
    }
}
