import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IBillingApi,
    IBillingDataResponse,
    IPlanHistoryEntry,
    IUpdateBillingRequest,
} from "@/lib/api/endpoints/billing.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

const apiInstance: { readonly billing: IBillingApi } = createApiContracts()

/**
 * Параметры useBilling().
 */
export interface IUseBillingArgs {
    /**
     * Включить/выключить автозагрузку.
     */
    readonly enabled?: boolean
}

/**
 * Результат useBilling().
 */
export interface IUseBillingResult {
    /**
     * Query текущего snapshot биллинга и истории.
     */
    readonly billingQuery: UseQueryResult<IBillingDataResponse, Error>
    /**
     * Query истории изменений.
     */
    readonly historyQuery: UseQueryResult<readonly IPlanHistoryEntry[], Error>
    /**
     * Мутация обновления плана/статуса.
     */
    readonly updatePlan: UseMutationResult<IBillingDataResponse, Error, IUpdateBillingRequest>
}

/**
 * React Query хук для billing lifecycle.
 *
 * Загружает snapshot биллинга и историю.
 * Предоставляет мутацию для обновления плана/статуса.
 *
 * @param args - Конфигурация загрузки.
 * @returns Queries и мутации для billing.
 */
export function useBilling(args: IUseBillingArgs = {}): IUseBillingResult {
    const { enabled = true } = args
    const queryClient = useQueryClient()

    const billingQuery = useQuery({
        queryKey: queryKeys.billing.all(),
        queryFn: async (): Promise<IBillingDataResponse> => {
            return apiInstance.billing.getBilling()
        },
        enabled,
    })

    const historyQuery = useQuery({
        queryKey: queryKeys.billing.history(),
        queryFn: async (): Promise<readonly IPlanHistoryEntry[]> => {
            return apiInstance.billing.getHistory()
        },
        enabled,
    })

    const updatePlan = useMutation<IBillingDataResponse, Error, IUpdateBillingRequest>({
        mutationFn: async (request: IUpdateBillingRequest): Promise<IBillingDataResponse> => {
            return apiInstance.billing.updatePlan(request)
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.billing.all(),
            })
            await queryClient.invalidateQueries({
                queryKey: queryKeys.billing.history(),
            })
        },
    })

    return {
        billingQuery,
        historyQuery,
        updatePlan,
    }
}
