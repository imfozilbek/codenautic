import {useQuery, type UseQueryResult} from "@tanstack/react-query"

import {createApiContracts} from "@/lib/api"
import type {TSystemHealthResponse} from "@/lib/api"
import {queryKeys} from "@/lib/query/query-keys"

const api = createApiContracts()

/**
 * React Query hook для проверки доступности runtime/api.
 *
 * @returns Query-результат с состоянием health endpoint.
 */
export function useHealthQuery(): UseQueryResult<TSystemHealthResponse, Error> {
    return useQuery({
        queryKey: queryKeys.system.health(),
        queryFn: async (): Promise<TSystemHealthResponse> => {
            return api.system.getHealth()
        },
    })
}
