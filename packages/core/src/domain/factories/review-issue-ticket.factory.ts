import {
    ReviewIssueTicket,
    type IReviewIssueTicketProps,
} from "../entities/review-issue-ticket.entity"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Payload for creating new review issue ticket.
 */
export interface ICreateReviewIssueTicketProps extends IReviewIssueTicketProps {}

/**
 * Persistence snapshot for review issue ticket restoration.
 */
export interface IReconstituteReviewIssueTicketProps extends IReviewIssueTicketProps {
    id: string
}

/**
 * Factory for review issue ticket creation and restoration.
 */
export class ReviewIssueTicketFactory
    implements
        IEntityFactory<
            ReviewIssueTicket,
            ICreateReviewIssueTicketProps,
            IReconstituteReviewIssueTicketProps
        >
{
    /**
     * Creates factory instance.
     */
    public constructor() {}

    /**
     * Creates new review issue ticket entity.
     *
     * @param input New ticket payload.
     * @returns New review issue ticket entity.
     */
    public create(input: ICreateReviewIssueTicketProps): ReviewIssueTicket {
        return new ReviewIssueTicket(UniqueId.create(), {
            ...input,
        })
    }

    /**
     * Restores review issue ticket from persistence snapshot.
     *
     * @param input Persistence payload.
     * @returns Restored review issue ticket entity.
     */
    public reconstitute(input: IReconstituteReviewIssueTicketProps): ReviewIssueTicket {
        return new ReviewIssueTicket(UniqueId.create(input.id), {
            sourceReviewId: input.sourceReviewId,
            sourceSuggestionIds: input.sourceSuggestionIds,
            filePath: input.filePath,
            category: input.category,
            occurrenceCount: input.occurrenceCount,
            status: input.status,
        })
    }
}
