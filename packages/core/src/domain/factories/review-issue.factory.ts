import {ReviewIssue, type IReviewIssueProps} from "../entities/review-issue.entity"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Payload for creating new review issue entity.
 */
export interface ICreateReviewIssueProps extends IReviewIssueProps {}

/**
 * Persistence snapshot for review issue reconstitution.
 */
export interface IReconstituteReviewIssueProps extends IReviewIssueProps {
    id: string
}

/**
 * Factory for review issue creation and restoration.
 */
export class ReviewIssueFactory
    implements IEntityFactory<ReviewIssue, ICreateReviewIssueProps, IReconstituteReviewIssueProps>
{
    /**
     * Creates factory instance.
     */
    public constructor() {}

    /**
     * Creates new review issue entity.
     *
     * @param input New review issue payload.
     * @returns New review issue entity.
     */
    public create(input: ICreateReviewIssueProps): ReviewIssue {
        return new ReviewIssue(UniqueId.create(), {
            ...input,
        })
    }

    /**
     * Restores review issue from persistence snapshot.
     *
     * @param input Persistence payload.
     * @returns Restored review issue entity.
     */
    public reconstitute(input: IReconstituteReviewIssueProps): ReviewIssue {
        return new ReviewIssue(UniqueId.create(input.id), {
            filePath: input.filePath,
            lineRange: input.lineRange,
            severity: input.severity,
            category: input.category,
            message: input.message,
            suggestion: input.suggestion,
            codeBlock: input.codeBlock,
        })
    }
}
