import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type { IRepoConfigApi } from "@/lib/api/endpoints/repo-config.endpoint"
import type {
    IRepoConfigResponse,
    IUpdateRepoConfigRequest,
    IUpdateRepoConfigResponse,
} from "@/lib/api/endpoints/repo-config.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

type TRepoConfigOptimisticContext = {
    readonly previousConfig?: IRepoConfigResponse
}

const api: { readonly repoConfig: IRepoConfigApi } = createApiContracts()

/** Параметры `useRepoConfig()`. */
export interface IUseRepoConfigArgs {
    /** Целевой репозиторий. */
    readonly repositoryId: string
    /** Включить/выключить загрузку. */
    readonly enabled?: boolean
}

/** Результат `useRepoConfig()`. */
export interface IUseRepoConfigResult {
    /** Запрос repo config. */
    readonly repoConfigQuery: UseQueryResult<IRepoConfigResponse, Error>
    /** Мутация сохранения repo config. */
    readonly saveRepoConfig: UseMutationResult<
        IUpdateRepoConfigResponse,
        Error,
        IUpdateRepoConfigRequest,
        TRepoConfigOptimisticContext
    >
}

function normalizeRepositoryId(repositoryId: string): string {
    return repositoryId.trim()
}

/**
 * React Query hook для загрузки и сохранения `codenautic-config.yml`.
 *
 * @param args Параметры запроса/мутации.
 * @returns Query + mutation API для repo config.
 */
export function useRepoConfig(args: IUseRepoConfigArgs): IUseRepoConfigResult {
    const repositoryId = normalizeRepositoryId(args.repositoryId)
    const enabled = args.enabled ?? true
    const canRunQuery = enabled === true && repositoryId.length > 0
    const queryClient = useQueryClient()
    const queryKey = queryKeys.repoConfig.byRepository(repositoryId)

    const repoConfigQuery = useQuery({
        queryKey,
        queryFn: async (): Promise<IRepoConfigResponse> => {
            return api.repoConfig.getRepoConfig(repositoryId)
        },
        enabled: canRunQuery,

    })

    const saveRepoConfig = useMutation<
        IUpdateRepoConfigResponse,
        Error,
        IUpdateRepoConfigRequest,
        TRepoConfigOptimisticContext
    >({
        mutationFn: async (
            request: IUpdateRepoConfigRequest,
        ): Promise<IUpdateRepoConfigResponse> => {
            return api.repoConfig.updateRepoConfig(request)
        },
        onMutate: async (
            request: IUpdateRepoConfigRequest,
        ): Promise<TRepoConfigOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey })
            const previousConfig = queryClient.getQueryData<IRepoConfigResponse>(queryKey)
            if (previousConfig === undefined) {
                return { previousConfig }
            }

            const nextConfig = {
                ...previousConfig.config,
                configYaml: request.configYaml ?? previousConfig.config.configYaml,
                ignorePatterns: request.ignorePatterns ?? previousConfig.config.ignorePatterns,
                reviewMode: request.reviewMode ?? previousConfig.config.reviewMode,
            }
            queryClient.setQueryData<IRepoConfigResponse>(queryKey, {
                config: nextConfig,
            })

            return { previousConfig }
        },
        onError: (_error, _request, context): void => {
            if (context?.previousConfig !== undefined) {
                queryClient.setQueryData(queryKey, context.previousConfig)
            }
        },
        onSuccess: (response): void => {
            queryClient.setQueryData<IRepoConfigResponse>(queryKey, response)
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey })
        },
    })

    return {
        repoConfigQuery,
        saveRepoConfig,
    }
}
