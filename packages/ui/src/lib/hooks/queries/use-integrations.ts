import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IIntegrationResponse,
    IIntegrationState,
    IIntegrationsApi,
    IIntegrationsListResponse,
    ISaveIntegrationConfigRequest,
    ITestIntegrationRequest,
    ITestIntegrationResponse,
    IToggleIntegrationRequest,
} from "@/lib/api/endpoints/integrations.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

/**
 * Контекст для optimistic update.
 */
type TIntegrationsOptimisticContext = {
    readonly previousIntegrations?: IIntegrationsListResponse
}

const apiInstance: { readonly integrations: IIntegrationsApi } = createApiContracts()

/**
 * Параметры useIntegrations().
 */
export interface IUseIntegrationsArgs {
    /**
     * Включить/выключить автозагрузку списка интеграций.
     */
    readonly enabled?: boolean
}

/**
 * Результат useIntegrations().
 */
export interface IUseIntegrationsResult {
    /**
     * Query списка интеграций.
     */
    readonly integrationsQuery: UseQueryResult<IIntegrationsListResponse, Error>
    /**
     * Мутация подключения/отключения интеграции.
     */
    readonly toggleConnection: UseMutationResult<
        IIntegrationResponse,
        Error,
        IToggleIntegrationRequest,
        TIntegrationsOptimisticContext
    >
    /**
     * Мутация сохранения конфигурации интеграции.
     */
    readonly saveConfig: UseMutationResult<
        IIntegrationResponse,
        Error,
        ISaveIntegrationConfigRequest,
        TIntegrationsOptimisticContext
    >
    /**
     * Мутация тестирования соединения с интеграцией.
     */
    readonly testConnection: UseMutationResult<
        ITestIntegrationResponse,
        Error,
        ITestIntegrationRequest
    >
}

/**
 * Заменяет интеграцию в списке по id.
 *
 * @param list - Текущий список.
 * @param updated - Обновлённая интеграция.
 * @returns Новый список с заменённой интеграцией.
 */
function replaceIntegrationInList(
    list: IIntegrationsListResponse,
    updated: IIntegrationState,
): IIntegrationsListResponse {
    return {
        total: list.total,
        integrations: list.integrations.map((item): IIntegrationState => {
            if (item.id !== updated.id) {
                return item
            }
            return updated
        }),
    }
}

/**
 * React Query хук для управления интеграциями.
 *
 * @param args - Конфигурация загрузки.
 * @returns Query списка и мутации toggle/saveConfig/test.
 */
export function useIntegrations(args: IUseIntegrationsArgs = {}): IUseIntegrationsResult {
    const { enabled = true } = args
    const queryClient = useQueryClient()
    const listQueryKey = queryKeys.integrations.list()

    const integrationsQuery = useQuery({
        queryKey: listQueryKey,
        queryFn: async (): Promise<IIntegrationsListResponse> => {
            return apiInstance.integrations.list()
        },
        enabled,
    })

    const toggleConnection = useMutation<
        IIntegrationResponse,
        Error,
        IToggleIntegrationRequest,
        TIntegrationsOptimisticContext
    >({
        mutationFn: async (
            request: IToggleIntegrationRequest,
        ): Promise<IIntegrationResponse> => {
            return apiInstance.integrations.toggleConnection(request)
        },
        onMutate: async (
            request: IToggleIntegrationRequest,
        ): Promise<TIntegrationsOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: listQueryKey })
            const previousIntegrations =
                queryClient.getQueryData<IIntegrationsListResponse>(listQueryKey)
            if (previousIntegrations === undefined) {
                return { previousIntegrations }
            }

            queryClient.setQueryData<IIntegrationsListResponse>(listQueryKey, {
                total: previousIntegrations.total,
                integrations: previousIntegrations.integrations.map(
                    (item): IIntegrationState => {
                        if (item.id !== request.id) {
                            return item
                        }
                        return {
                            ...item,
                            connected: request.connected,
                            status: request.connected ? item.status : "disconnected",
                        }
                    },
                ),
            })

            return { previousIntegrations }
        },
        onError: (_error, _request, context): void => {
            if (context?.previousIntegrations !== undefined) {
                queryClient.setQueryData(listQueryKey, context.previousIntegrations)
            }
        },
        onSuccess: (response): void => {
            const current =
                queryClient.getQueryData<IIntegrationsListResponse>(listQueryKey)
            if (current === undefined) {
                return
            }
            queryClient.setQueryData(
                listQueryKey,
                replaceIntegrationInList(current, response.integration),
            )
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all() })
        },
    })

    const saveConfig = useMutation<
        IIntegrationResponse,
        Error,
        ISaveIntegrationConfigRequest,
        TIntegrationsOptimisticContext
    >({
        mutationFn: async (
            request: ISaveIntegrationConfigRequest,
        ): Promise<IIntegrationResponse> => {
            return apiInstance.integrations.saveConfig(request)
        },
        onMutate: async (
            request: ISaveIntegrationConfigRequest,
        ): Promise<TIntegrationsOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: listQueryKey })
            const previousIntegrations =
                queryClient.getQueryData<IIntegrationsListResponse>(listQueryKey)
            if (previousIntegrations === undefined) {
                return { previousIntegrations }
            }

            queryClient.setQueryData<IIntegrationsListResponse>(listQueryKey, {
                total: previousIntegrations.total,
                integrations: previousIntegrations.integrations.map(
                    (item): IIntegrationState => {
                        if (item.id !== request.id) {
                            return item
                        }
                        return {
                            ...item,
                            workspace: request.workspace ?? item.workspace,
                            target: request.target ?? item.target,
                            syncEnabled: request.syncEnabled ?? item.syncEnabled,
                            notificationsEnabled:
                                request.notificationsEnabled ?? item.notificationsEnabled,
                        }
                    },
                ),
            })

            return { previousIntegrations }
        },
        onError: (_error, _request, context): void => {
            if (context?.previousIntegrations !== undefined) {
                queryClient.setQueryData(listQueryKey, context.previousIntegrations)
            }
        },
        onSuccess: (response): void => {
            const current =
                queryClient.getQueryData<IIntegrationsListResponse>(listQueryKey)
            if (current === undefined) {
                return
            }
            queryClient.setQueryData(
                listQueryKey,
                replaceIntegrationInList(current, response.integration),
            )
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all() })
        },
    })

    const testConnection = useMutation<
        ITestIntegrationResponse,
        Error,
        ITestIntegrationRequest
    >({
        mutationFn: async (
            request: ITestIntegrationRequest,
        ): Promise<ITestIntegrationResponse> => {
            return apiInstance.integrations.testConnection(request)
        },
        onSuccess: (response): void => {
            const current =
                queryClient.getQueryData<IIntegrationsListResponse>(listQueryKey)
            if (current === undefined) {
                return
            }

            queryClient.setQueryData<IIntegrationsListResponse>(listQueryKey, {
                total: current.total,
                integrations: current.integrations.map((item): IIntegrationState => {
                    if (item.id !== response.id) {
                        return item
                    }
                    return {
                        ...item,
                        status: response.ok ? "connected" : "degraded",
                        lastSyncAt: new Date().toISOString(),
                    }
                }),
            })
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all() })
        },
    })

    return {
        integrationsQuery,
        toggleConnection,
        saveConfig,
        testConnection,
    }
}
