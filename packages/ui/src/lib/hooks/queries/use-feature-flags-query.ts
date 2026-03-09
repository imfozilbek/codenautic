import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type { IFeatureFlagsResponse, TFeatureFlagKey } from "@/lib/feature-flags/feature-flags"
import { resolveFeatureFlag } from "@/lib/feature-flags/feature-flags"
import { queryKeys } from "@/lib/query/query-keys"

const api = createApiContracts()

/**
 * Параметры `useFeatureFlagsQuery` hook.
 *
 * Зарезервирован для единообразия с остальными query-hooks;
 * расширяется при появлении конфигурационных опций.
 */
export interface IUseFeatureFlagsQueryArgs {
    /** Включить/выключить автозагрузку. */
    readonly enabled?: boolean
}

/**
 * Минимальный query-state контракт для проверки feature flag состояния.
 */
export type IFeatureFlagQueryState = Pick<
    UseQueryResult<IFeatureFlagsResponse, Error>,
    "data" | "error" | "isPending"
>

/**
 * Результат `useFeatureFlagsQuery` hook.
 */
export interface IUseFeatureFlagsQueryResult {
    /** Query-результат с серверными флагами. */
    readonly featureFlagsQuery: UseQueryResult<IFeatureFlagsResponse, Error>
}

/**
 * Загружает feature flags через React Query.
 *
 * @param args Параметры запроса.
 * @returns Query-результат с серверными флагами.
 */
export function useFeatureFlagsQuery(
    args: IUseFeatureFlagsQueryArgs = {},
): IUseFeatureFlagsQueryResult {
    const { enabled = true } = args

    const featureFlagsQuery = useQuery({
        queryKey: queryKeys.featureFlags.all(),
        queryFn: async (): Promise<IFeatureFlagsResponse> => {
            return api.featureFlags.getFeatureFlags()
        },
        retry: false,
        refetchInterval: 60_000,
        enabled,
    })

    return {
        featureFlagsQuery,
    }
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
