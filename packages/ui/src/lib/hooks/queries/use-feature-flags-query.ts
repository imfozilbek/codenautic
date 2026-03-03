import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type { IFeatureFlagsResponse, TFeatureFlagKey } from "@/lib/feature-flags/feature-flags"
import { resolveFeatureFlag } from "@/lib/feature-flags/feature-flags"
import { queryKeys } from "@/lib/query/query-keys"

const api = createApiContracts()

/**
 * Минимальный query-state контракт для проверки feature flag состояния.
 */
export type IFeatureFlagQueryState = Pick<
    UseQueryResult<IFeatureFlagsResponse, Error>,
    "data" | "error" | "isPending"
>

/**
 * Загружает feature flags через React Query.
 *
 * @returns Query-результат с серверными флагами.
 */
export function useFeatureFlagsQuery(): UseQueryResult<IFeatureFlagsResponse, Error> {
    return useQuery({
        queryKey: queryKeys.featureFlags.all(),
        queryFn: async (): Promise<IFeatureFlagsResponse> => {
            return api.featureFlags.getFeatureFlags()
        },
        retry: false,
        refetchInterval: 60_000,
    })
}

/**
 * Проверяет флаг с deny-by-default поведением для pending/error состояний.
 *
 * @param queryState Query состояние feature flags.
 * @param flagKey Ключ feature flag.
 * @returns true только при успешной загрузке и явно включенном флаге.
 */
export function isFeatureFlagEnabled(
    queryState: IFeatureFlagQueryState,
    flagKey: TFeatureFlagKey,
): boolean {
    if (queryState.isPending === true) {
        return false
    }

    if (queryState.error !== null) {
        return false
    }

    return resolveFeatureFlag(queryState.data?.flags, flagKey)
}
