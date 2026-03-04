import type {IUseCase} from "../ports/inbound/use-case.port"
import type {ISuggestionClusterDTO} from "../dto/review/suggestion-cluster.dto"
import type {IClusterSuggestionsInput, ISuggestionForClustering} from "../use-cases/cluster-suggestions.use-case"
import type {SuggestionClusteringMode} from "../dto/analytics/suggestion-clustering.dto"
import {ValidationError} from "../../domain/errors/validation.error"

/**
 * Dependencies for suggestion clustering service.
 */
interface ISuggestionClusteringServiceDependencies {
    /**
     * Use case used for actual clustering algorithm.
     */
    readonly clusteringUseCase: IUseCase<
        IClusterSuggestionsInput,
        readonly ISuggestionClusterDTO[],
        ValidationError
    >
}

/**
 * Domain service that clusters suggestions by similarity mode.
 */
export interface ISuggestionClusteringService {
    /**
     * Clusters suggestion candidates.
     *
     * @param suggestions Suggestions to cluster.
     * @param mode Optional clustering mode.
     * @returns Promise with cluster payloads.
     */
    cluster(
        suggestions: readonly ISuggestionForClustering[],
        mode?: SuggestionClusteringMode,
    ): Promise<readonly ISuggestionClusterDTO[]>
}

/**
 * Default application service implementation for suggestion clustering.
 */
export class SuggestionClusteringService implements ISuggestionClusteringService {
    private readonly useCase: IUseCase<
        {
            readonly suggestions: readonly ISuggestionForClustering[]
            readonly mode?: SuggestionClusteringMode
        },
        readonly ISuggestionClusterDTO[],
        ValidationError
    >

    public constructor(dependencies: ISuggestionClusteringServiceDependencies) {
        this.useCase = dependencies.clusteringUseCase
    }

    /**
     * {@inheritDoc}
     */
    public async cluster(
        suggestions: readonly ISuggestionForClustering[],
        mode?: SuggestionClusteringMode,
    ): Promise<readonly ISuggestionClusterDTO[]> {
        const result = await this.useCase.execute({suggestions, mode})
        if (result.isFail) {
            throw result.error
        }

        return result.value
    }
}
