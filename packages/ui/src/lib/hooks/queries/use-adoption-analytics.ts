import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IAdoptionAnalyticsApi,
    IAdoptionAnalyticsResponse,
    TAnalyticsRange,
} from "@/lib/api/endpoints/adoption-analytics.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

const apiInstance: { readonly adoptionAnalytics: IAdoptionAnalyticsApi } = createApiContracts()

/**
 * Параметры useAdoptionAnalytics().
 */
export interface IUseAdoptionAnalyticsArgs {
    /**
     * Диапазон дат для выборки.
     */
    readonly range: TAnalyticsRange
    /**
     * Включить/выключить автозагрузку.
     */
    readonly enabled?: boolean
}

/**
 * Результат useAdoptionAnalytics().
 */
export interface IUseAdoptionAnalyticsResult {
    /**
     * Query данных adoption analytics.
     */
    readonly analyticsQuery: UseQueryResult<IAdoptionAnalyticsResponse, Error>
}

/**
 * React Query хук для загрузки adoption analytics данных.
 *
 * Загружает funnel stages, workflow health и KPI метрики
 * за указанный диапазон дат.
 *
 * @param args - Конфигурация загрузки.
 * @returns Query с данными adoption analytics.
 */
export function useAdoptionAnalytics(args: IUseAdoptionAnalyticsArgs): IUseAdoptionAnalyticsResult {
    const { range, enabled = true } = args

    const analyticsQuery = useQuery({
        queryKey: queryKeys.adoptionAnalytics.byRange(range),
        queryFn: async (): Promise<IAdoptionAnalyticsResponse> => {
            return apiInstance.adoptionAnalytics.getFunnel(range)
        },
        enabled,
    })

    return { analyticsQuery }
}
