import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ISuggestionDTO} from "../../dto/review/suggestion.dto"
import type {IReviewIssueTicketRepository} from "../../ports/outbound/review/review-issue-ticket-repository.port"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {
    REVIEW_ISSUE_TICKET_STATUS,
} from "../../../domain/entities/review-issue-ticket.entity"
import {ReviewIssueTicketFactory} from "../../../domain/factories/review-issue-ticket.factory"
import {FilePath} from "../../../domain/value-objects/file-path.value-object"
import {Result} from "../../../shared/result"

/**
 * Lifecycle actions produced by issue-ticket creation workflow.
 */
export const ISSUE_TICKET_ACTION = {
    CREATED: "CREATED",
    UPDATED: "UPDATED",
    SKIPPED: "SKIPPED",
} as const

/**
 * Skip reasons for issue-ticket creation workflow.
 */
export const ISSUE_TICKET_SKIP_REASON = {
    AUTO_CREATE_DISABLED: "AUTO_CREATE_DISABLED",
    DUPLICATE_SUGGESTION: "DUPLICATE_SUGGESTION",
} as const

/**
 * Output action literal.
 */
export type IssueTicketAction =
    (typeof ISSUE_TICKET_ACTION)[keyof typeof ISSUE_TICKET_ACTION]

/**
 * Output skip-reason literal.
 */
export type IssueTicketSkipReason =
    (typeof ISSUE_TICKET_SKIP_REASON)[keyof typeof ISSUE_TICKET_SKIP_REASON]

/**
 * Input payload for issue-ticket creation from suggestion.
 */
export interface ICreateIssueFromSuggestionInput {
    readonly repositoryId: string
    readonly sourceReviewId: string
    readonly suggestion: ISuggestionDTO
    readonly autoCreateIssues?: boolean
}

/**
 * Output payload for issue-ticket creation from suggestion.
 */
export interface ICreateIssueFromSuggestionOutput {
    readonly action: IssueTicketAction
    readonly ticketId?: string
    readonly occurrenceCount?: number
    readonly skipReason?: IssueTicketSkipReason
}

/**
 * Dependencies for issue-ticket creation use case.
 */
export interface ICreateIssueFromSuggestionUseCaseDependencies {
    readonly reviewIssueTicketRepository: IReviewIssueTicketRepository
    readonly reviewIssueTicketFactory: ReviewIssueTicketFactory
}

/**
 * Normalized suggestion fields needed for deterministic matching.
 */
interface IPreparedSuggestion {
    readonly suggestionId: string
    readonly filePath: FilePath
    readonly category: string
}

/**
 * Creates or updates repeated-issue tickets from review suggestions.
 */
export class CreateIssueFromSuggestionUseCase
    implements
        IUseCase<
            ICreateIssueFromSuggestionInput,
            ICreateIssueFromSuggestionOutput,
            ValidationError
        >
{
    private readonly reviewIssueTicketRepository: IReviewIssueTicketRepository
    private readonly reviewIssueTicketFactory: ReviewIssueTicketFactory

    /**
     * Creates use case instance.
     *
     * @param dependencies Required dependencies.
     */
    public constructor(dependencies: ICreateIssueFromSuggestionUseCaseDependencies) {
        this.reviewIssueTicketRepository = dependencies.reviewIssueTicketRepository
        this.reviewIssueTicketFactory = dependencies.reviewIssueTicketFactory
    }

    /**
     * Creates a new issue ticket or increments an existing one.
     *
     * @param input Request payload.
     * @returns Creation workflow result.
     */
    public async execute(
        input: ICreateIssueFromSuggestionInput,
    ): Promise<Result<ICreateIssueFromSuggestionOutput, ValidationError>> {
        const validation = this.validateInput(input)
        if (validation.length > 0) {
            return Result.fail<ICreateIssueFromSuggestionOutput, ValidationError>(
                new ValidationError("Create issue from suggestion validation failed", validation),
            )
        }

        if (input.autoCreateIssues !== true) {
            return Result.ok<ICreateIssueFromSuggestionOutput, ValidationError>({
                action: ISSUE_TICKET_ACTION.SKIPPED,
                skipReason: ISSUE_TICKET_SKIP_REASON.AUTO_CREATE_DISABLED,
            })
        }

        const repositoryId = input.repositoryId.trim()
        const sourceReviewId = input.sourceReviewId.trim()
        const preparedSuggestion = this.prepareSuggestion(input.suggestion)
        if (preparedSuggestion.isFail) {
            return Result.fail<ICreateIssueFromSuggestionOutput, ValidationError>(
                preparedSuggestion.error,
            )
        }

        const existingBySuggestion = await this.reviewIssueTicketRepository.findBySuggestionId(
            preparedSuggestion.value.suggestionId,
        )
        if (existingBySuggestion !== null) {
            return Result.ok<ICreateIssueFromSuggestionOutput, ValidationError>({
                action: ISSUE_TICKET_ACTION.SKIPPED,
                ticketId: existingBySuggestion.id.value,
                occurrenceCount: existingBySuggestion.occurrenceCount,
                skipReason: ISSUE_TICKET_SKIP_REASON.DUPLICATE_SUGGESTION,
            })
        }

        const openTickets =
            await this.reviewIssueTicketRepository.findOpenByRepository(repositoryId)
        const matchingTicket = openTickets.find((ticket) => {
            return (
                ticket.filePath.toString() === preparedSuggestion.value.filePath.toString() &&
                ticket.category === preparedSuggestion.value.category
            )
        })

        if (matchingTicket !== undefined) {
            matchingTicket.addOccurrence(preparedSuggestion.value.suggestionId)
            await this.reviewIssueTicketRepository.save(matchingTicket)

            return Result.ok<ICreateIssueFromSuggestionOutput, ValidationError>({
                action: ISSUE_TICKET_ACTION.UPDATED,
                ticketId: matchingTicket.id.value,
                occurrenceCount: matchingTicket.occurrenceCount,
            })
        }

        const ticket = this.reviewIssueTicketFactory.create({
            sourceReviewId,
            sourceSuggestionIds: [preparedSuggestion.value.suggestionId],
            filePath: preparedSuggestion.value.filePath,
            category: preparedSuggestion.value.category,
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })

        await this.reviewIssueTicketRepository.save(ticket)

        return Result.ok<ICreateIssueFromSuggestionOutput, ValidationError>({
            action: ISSUE_TICKET_ACTION.CREATED,
            ticketId: ticket.id.value,
            occurrenceCount: ticket.occurrenceCount,
        })
    }

    /**
     * Validates input payload shape.
     *
     * @param input Request payload.
     * @returns Validation errors.
     */
    private validateInput(input: ICreateIssueFromSuggestionInput): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []

        if (typeof input.repositoryId !== "string" || input.repositoryId.trim().length === 0) {
            fields.push({
                field: "repositoryId",
                message: "must be a non-empty string",
            })
        }

        if (typeof input.sourceReviewId !== "string" || input.sourceReviewId.trim().length === 0) {
            fields.push({
                field: "sourceReviewId",
                message: "must be a non-empty string",
            })
        }

        if (
            typeof input.autoCreateIssues !== "undefined" &&
            typeof input.autoCreateIssues !== "boolean"
        ) {
            fields.push({
                field: "autoCreateIssues",
                message: "must be a boolean when provided",
            })
        }

        if (typeof input.suggestion !== "object" || input.suggestion === null) {
            fields.push({
                field: "suggestion",
                message: "must be an object",
            })
            return fields
        }

        fields.push(...this.validateSuggestionField(input.suggestion.id, "suggestion.id"))
        fields.push(...this.validateSuggestionField(input.suggestion.filePath, "suggestion.filePath"))
        fields.push(...this.validateSuggestionField(input.suggestion.category, "suggestion.category"))

        return fields
    }

    /**
     * Validates required suggestion field shape.
     *
     * @param value Field value.
     * @param field Field path.
     * @returns Validation errors.
     */
    private validateSuggestionField(value: string, field: string): IValidationErrorField[] {
        if (typeof value !== "string" || value.trim().length === 0) {
            return [
                {
                    field,
                    message: "must be a non-empty string",
                },
            ]
        }

        return []
    }

    /**
     * Normalizes suggestion fields used by matching logic.
     *
     * @param suggestion Raw suggestion payload.
     * @returns Prepared suggestion or validation error.
     */
    private prepareSuggestion(
        suggestion: ISuggestionDTO,
    ): Result<IPreparedSuggestion, ValidationError> {
        try {
            return Result.ok<IPreparedSuggestion, ValidationError>({
                suggestionId: suggestion.id.trim(),
                filePath: FilePath.create(suggestion.filePath),
                category: this.normalizeCategory(suggestion.category),
            })
        } catch (error: unknown) {
            if (error instanceof Error) {
                return Result.fail<IPreparedSuggestion, ValidationError>(
                    new ValidationError("Create issue from suggestion validation failed", [
                        {
                            field: "suggestion",
                            message: error.message,
                        },
                    ]),
                )
            }

            throw error
        }
    }

    /**
     * Normalizes issue category to stable matching key.
     *
     * @param value Raw suggestion category.
     * @returns Normalized category key.
     */
    private normalizeCategory(value: string): string {
        const normalized = value.trim().toLowerCase()
        if (normalized.length === 0) {
            throw new Error("Suggestion category cannot be empty")
        }

        return normalized
    }
}
