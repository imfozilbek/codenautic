import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IGitProviderConnection,
    IGitProvidersApi,
    IListGitProvidersResponse,
    ITestGitProviderConnectionResponse,
    IUpdateGitProviderConnectionRequest,
    IUpdateGitProviderConnectionResponse,
} from "@/lib/api/endpoints/git-providers.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

type TGitProvidersOptimisticContext = {
    readonly previousProviders?: IListGitProvidersResponse
}

const api: { readonly gitProviders: IGitProvidersApi } = createApiContracts()

/** Параметры useGitProviders(). */
export interface IUseGitProvidersArgs {
    /** Включить/выключить автозагрузку списка. */
    readonly enabled?: boolean
}

/** Результат useGitProviders(). */
export interface IUseGitProvidersResult {
    /** Query списка Git провайдеров. */
    readonly providersQuery: UseQueryResult<IListGitProvidersResponse, Error>
    /** Мутация изменения connected-state провайдера. */
    readonly updateConnection: UseMutationResult<
        IUpdateGitProviderConnectionResponse,
        Error,
        IUpdateGitProviderConnectionRequest,
        TGitProvidersOptimisticContext
    >
    /** Мутация теста connectivity провайдера. */
    readonly testConnection: UseMutationResult<ITestGitProviderConnectionResponse, Error, string>
}

/**
 * React Query хук управления Git provider integrations.
 *
 * @param args Конфигурация загрузки.
 * @returns Query + mutations для list/update/test.
 */
export function useGitProviders(args: IUseGitProvidersArgs = {}): IUseGitProvidersResult {
    const { enabled = true } = args
    const queryClient = useQueryClient()
    const providersQueryKey = queryKeys.gitProviders.list()

    const providersQuery = useQuery({
        queryKey: providersQueryKey,
        queryFn: async (): Promise<IListGitProvidersResponse> => {
            return api.gitProviders.listProviders()
        },
        enabled,
        refetchOnWindowFocus: false,
    })

    const updateConnection = useMutation<
        IUpdateGitProviderConnectionResponse,
        Error,
        IUpdateGitProviderConnectionRequest,
        TGitProvidersOptimisticContext
    >({
        mutationFn: async (
            request: IUpdateGitProviderConnectionRequest,
        ): Promise<IUpdateGitProviderConnectionResponse> => {
            return api.gitProviders.updateConnection(request)
        },
        onMutate: async (
            request: IUpdateGitProviderConnectionRequest,
        ): Promise<TGitProvidersOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: providersQueryKey })
            const previousProviders =
                queryClient.getQueryData<IListGitProvidersResponse>(providersQueryKey)

            if (previousProviders === undefined) {
                return { previousProviders }
            }

            queryClient.setQueryData<IListGitProvidersResponse>(providersQueryKey, {
                providers: previousProviders.providers.map((provider): IGitProviderConnection => {
                    if (provider.id !== request.providerId) {
                        return provider
                    }

                    return {
                        ...provider,
                        connected: request.connected,
                        status: request.connected ? "SYNCING" : "DISCONNECTED",
                    }
                }),
            })

            return { previousProviders }
        },
        onError: (_error, _request, context): void => {
            if (context?.previousProviders !== undefined) {
                queryClient.setQueryData(providersQueryKey, context.previousProviders)
            }
        },
        onSuccess: (response): void => {
            const current =
                queryClient.getQueryData<IListGitProvidersResponse>(providersQueryKey)
            if (current === undefined) {
                return
            }

            queryClient.setQueryData<IListGitProvidersResponse>(providersQueryKey, {
                providers: current.providers.map((provider): IGitProviderConnection => {
                    if (provider.id !== response.provider.id) {
                        return provider
                    }
                    return response.provider
                }),
            })
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey: providersQueryKey })
        },
    })

    const testConnection = useMutation({
        mutationFn: async (providerId: string): Promise<ITestGitProviderConnectionResponse> => {
            return api.gitProviders.testConnection(providerId)
        },
    })

    return {
        providersQuery,
        updateConnection,
        testConnection,
    }
}
