import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    ICcrWorkspaceApi,
    ICcrWorkspaceContextResponse,
    ICcrWorkspaceListResponse,
} from "@/lib/api/endpoints/ccr-workspace.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

const api: { readonly ccrWorkspace: ICcrWorkspaceApi } = createApiContracts()

/** Параметры useCcrWorkspace(). */
export interface IUseCcrWorkspaceArgs {
    /** Идентификатор активного review для context-запроса. */
    readonly reviewId?: string
    /** Включить/выключить загрузку данных. */
    readonly enabled?: boolean
}

/** Результат useCcrWorkspace(). */
export interface IUseCcrWorkspaceResult {
    /** Query списка CCR для management/workspace. */
    readonly ccrListQuery: UseQueryResult<ICcrWorkspaceListResponse, Error>
    /** Query review-context для выбранного review id. */
    readonly ccrContextQuery: UseQueryResult<ICcrWorkspaceContextResponse, Error>
}

/**
 * React Query-хук доступа к CCR workspace данным.
 *
 * @param args Конфигурация загрузки list/context.
 * @returns Query-объекты для list и detail context.
 */
export function useCcrWorkspace(args: IUseCcrWorkspaceArgs = {}): IUseCcrWorkspaceResult {
    const { enabled = true, reviewId } = args
    const normalizedReviewId = reviewId?.trim() ?? ""
    const isContextEnabled = enabled === true && normalizedReviewId.length > 0

    const ccrListQuery = useQuery({
        queryKey: queryKeys.ccrWorkspace.list(),
        queryFn: async (): Promise<ICcrWorkspaceListResponse> => {
            return api.ccrWorkspace.listCcrs()
        },
        enabled,
        refetchOnWindowFocus: false,
    })

    const ccrContextQuery = useQuery({
        queryKey: queryKeys.ccrWorkspace.context(normalizedReviewId),
        queryFn: async (): Promise<ICcrWorkspaceContextResponse> => {
            return api.ccrWorkspace.getWorkspaceContext(normalizedReviewId)
        },
        enabled: isContextEnabled,
        refetchOnWindowFocus: false,
    })

    return {
        ccrContextQuery,
        ccrListQuery,
    }
}
