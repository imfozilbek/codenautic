import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type { TSystemHealthResponse } from "@/lib/api"
import { queryKeys } from "@/lib/query/query-keys"

const api = createApiContracts()

/**
 * Параметры `useHealthQuery` hook.
 *
 * Зарезервирован для единообразия с остальными query-hooks;
 * расширяется при появлении конфигурационных опций.
 */
export interface IUseHealthQueryArgs {
    /** Включить/выключить автозагрузку. */
    readonly enabled?: boolean
}

/**
 * Результат `useHealthQuery` hook.
 */
export interface IUseHealthQueryResult {
    /** Query-результат с состоянием health endpoint. */
    readonly healthQuery: UseQueryResult<TSystemHealthResponse, Error>
}

/**
 * React Query hook для проверки доступности runtime/api.
 *
 * @param args Параметры запроса.
 * @returns Query-результат с состоянием health endpoint.
 */
export function useHealthQuery(args: IUseHealthQueryArgs = {}): IUseHealthQueryResult {
    const { enabled = true } = args

    const healthQuery = useQuery({
        queryKey: queryKeys.system.health(),
        queryFn: async (): Promise<TSystemHealthResponse> => {
            return api.system.getHealth()
        },
        enabled,
    })

    return {
        healthQuery,
    }
}
