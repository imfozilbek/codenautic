import type {IRepository} from "../common/repository.port"
import type {ReviewIssueTicket} from "../../../../domain/entities/review-issue-ticket.entity"
import type {FilePath} from "../../../../domain/value-objects/file-path.value-object"

/**
 * Outbound persistence contract for review issue tickets.
 */
export interface IReviewIssueTicketRepository extends IRepository<ReviewIssueTicket> {
    /**
     * Finds tickets associated with a file path.
     *
     * @param path File path to search by.
     * @returns Matching issue tickets.
     */
    findByFilePath(path: FilePath): Promise<readonly ReviewIssueTicket[]>

    /**
     * Finds open tickets for a repository.
     *
     * Repository scoping may be resolved by the adapter through
     * `sourceReviewId -> review -> repositoryId`.
     *
     * @param repositoryId Repository identifier.
     * @returns Matching open issue tickets.
     */
    findOpenByRepository(repositoryId: string): Promise<readonly ReviewIssueTicket[]>

    /**
     * Finds ticket by source suggestion identifier.
     *
     * @param suggestionId Suggestion identifier.
     * @returns Matching issue ticket or null.
     */
    findBySuggestionId(suggestionId: string): Promise<ReviewIssueTicket | null>
}
