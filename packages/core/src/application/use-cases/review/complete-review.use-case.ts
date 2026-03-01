import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IDomainEventBus} from "../../ports/outbound/domain-event-bus.port"
import type {IReviewRepository} from "../../ports/outbound/review-repository.port"
import {type ReviewStatus} from "../../../domain/aggregates/review.aggregate"
import {DomainError} from "../../../domain/errors/domain.error"
import {ReviewNotFoundError} from "../../../domain/errors/review-not-found.error"
import {Result} from "../../../shared/result"
import {UniqueId} from "../../../domain/value-objects/unique-id.value-object"

/**
 * Input payload for complete review use case.
 */
export interface ICompleteReviewInput {
    reviewId: string
    consumedSeverity: number
    completedAt: Date
}

/**
 * Output payload for complete review use case.
 */
export interface ICompleteReviewOutput {
    reviewId: string
    status: ReviewStatus
    consumedSeverity: number
}

/**
 * Use case that orchestrates review completion lifecycle.
 */
export class CompleteReviewUseCase
    implements IUseCase<ICompleteReviewInput, ICompleteReviewOutput, DomainError>
{
    private readonly reviewRepository: IReviewRepository
    private readonly domainEventBus: IDomainEventBus

    /**
     * Creates use case instance.
     *
     * @param reviewRepository Review persistence port.
     * @param domainEventBus Domain event publication port.
     */
    public constructor(reviewRepository: IReviewRepository, domainEventBus: IDomainEventBus) {
        this.reviewRepository = reviewRepository
        this.domainEventBus = domainEventBus
    }

    /**
     * Completes review aggregate and publishes domain events.
     *
     * @param input Completion payload.
     * @returns Success or domain failure result.
     */
    public async execute(
        input: ICompleteReviewInput,
    ): Promise<Result<ICompleteReviewOutput, DomainError>> {
        const reviewId = UniqueId.create(input.reviewId)
        const review = await this.reviewRepository.findById(reviewId)

        if (review === null) {
            return Result.fail<ICompleteReviewOutput, DomainError>(
                new ReviewNotFoundError(input.reviewId),
            )
        }

        try {
            review.complete(input.consumedSeverity, input.completedAt)
        } catch (error: unknown) {
            if (error instanceof DomainError) {
                return Result.fail<ICompleteReviewOutput, DomainError>(error)
            }
            throw error
        }

        const domainEvents = review.pullDomainEvents()
        await this.reviewRepository.save(review)
        await this.domainEventBus.publish(domainEvents)

        return Result.ok<ICompleteReviewOutput, DomainError>({
            reviewId: review.id.value,
            status: review.status,
            consumedSeverity: review.consumedSeverity,
        })
    }
}
