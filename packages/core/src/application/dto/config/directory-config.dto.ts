import type {IReviewConfigDTO} from "../review/review-config.dto"

/**
 * Directory-specific review configuration override.
 */
export interface IDirectoryConfig {
    readonly path: string
    readonly config: Partial<IReviewConfigDTO>
}
