import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    ICodeCityApi,
    ICodeCityDependencyGraphResponse,
    IListCodeCityProfilesResponse,
} from "@/lib/api/endpoints/code-city.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

const api: { readonly codeCity: ICodeCityApi } = createApiContracts()

/**
 * Параметры useCodeCityProfiles().
 */
export interface IUseCodeCityProfilesArgs {
    /**
     * Включить/выключить автозагрузку.
     */
    readonly enabled?: boolean
}

/**
 * Результат useCodeCityProfiles().
 */
export interface IUseCodeCityProfilesResult {
    /**
     * Query списка профилей CodeCity.
     */
    readonly profilesQuery: UseQueryResult<IListCodeCityProfilesResponse, Error>
}

/**
 * React Query хук для загрузки профилей CodeCity.
 *
 * @param args - Конфигурация загрузки.
 * @returns Query для списка профилей.
 */
export function useCodeCityProfiles(
    args: IUseCodeCityProfilesArgs = {},
): IUseCodeCityProfilesResult {
    const { enabled = true } = args

    const profilesQuery = useQuery({
        queryKey: queryKeys.codeCity.profiles(),
        queryFn: async (): Promise<IListCodeCityProfilesResponse> => {
            return api.codeCity.getRepositoryProfiles()
        },
        enabled,
    })

    return { profilesQuery }
}

/**
 * Параметры useCodeCityDependencyGraph().
 */
export interface IUseCodeCityDependencyGraphArgs {
    /**
     * Идентификатор репозитория.
     */
    readonly repoId: string
    /**
     * Включить/выключить автозагрузку.
     */
    readonly enabled?: boolean
}

/**
 * Результат useCodeCityDependencyGraph().
 */
export interface IUseCodeCityDependencyGraphResult {
    /**
     * Query графа зависимостей.
     */
    readonly graphQuery: UseQueryResult<ICodeCityDependencyGraphResponse, Error>
}

/**
 * React Query хук для загрузки графа зависимостей CodeCity.
 *
 * @param args - Конфигурация с repoId.
 * @returns Query для графа зависимостей.
 */
export function useCodeCityDependencyGraph(
    args: IUseCodeCityDependencyGraphArgs,
): IUseCodeCityDependencyGraphResult {
    const { repoId, enabled = true } = args

    const graphQuery = useQuery({
        queryKey: queryKeys.codeCity.dependencyGraph(repoId),
        queryFn: async (): Promise<ICodeCityDependencyGraphResponse> => {
            return api.codeCity.getDependencyGraph(repoId)
        },
        enabled: enabled && repoId.length > 0,
    })

    return { graphQuery }
}
