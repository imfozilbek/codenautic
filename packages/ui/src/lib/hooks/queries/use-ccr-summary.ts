import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    ICCRSummaryApi,
    IGenerateCcrSummaryRequest,
    IGenerateCcrSummaryResponse,
} from "@/lib/api/endpoints/ccr-summary.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

const api: { readonly ccrSummary: ICCRSummaryApi } = createApiContracts()

/** Параметры `useCCRSummary` hook. */
export interface IUseCcrSummaryParams {
    /** Включить загрузку query-state. */
    readonly enabled?: boolean
    /** Репозиторий, для которого управляется summary. */
    readonly repositoryId: string
}

/** Результат `useCCRSummary` hook. */
export interface IUseCcrSummaryResult {
    /** Mutation генерации summary. */
    readonly generateSummary: UseMutationResult<
        IGenerateCcrSummaryResponse,
        Error,
        IGenerateCcrSummaryRequest
    >
    /** Query последнего сгенерированного summary. */
    readonly summaryQuery: UseQueryResult<IGenerateCcrSummaryResponse | null, Error>
}

/**
 * React Query hook для генерации и просмотра CCR summaries.
 *
 * @param params - repository scope и флаг enable.
 * @returns query + mutation для summary workflow.
 */
export function useCCRSummary(params: IUseCcrSummaryParams): IUseCcrSummaryResult {
    const queryClient = useQueryClient()
    const normalizedRepositoryId = params.repositoryId.trim()

    const summaryQuery = useQuery({
        queryKey: queryKeys.ccrSummary.byRepository(normalizedRepositoryId),
        queryFn: (): Promise<IGenerateCcrSummaryResponse | null> => {
            const cachedResponse = queryClient.getQueryData<IGenerateCcrSummaryResponse>(
                queryKeys.ccrSummary.byRepository(normalizedRepositoryId),
            )
            return Promise.resolve(
                cachedResponse ?? null,
            )
        },
        enabled: normalizedRepositoryId.length > 0 && (params.enabled ?? true),
    })

    const generateSummary = useMutation({
        mutationFn: async (
            request: IGenerateCcrSummaryRequest,
        ): Promise<IGenerateCcrSummaryResponse> => {
            return api.ccrSummary.generateSummary(request)
        },
        onSuccess: (response, request): void => {
            queryClient.setQueryData(
                queryKeys.ccrSummary.byRepository(request.repositoryId.trim()),
                response,
            )
        },
    })

    return {
        summaryQuery,
        generateSummary,
    }
}
