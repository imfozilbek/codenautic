import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IAdminConfigApi,
    IAdminConfigResponse,
    IAdminConfigValues,
    TAdminConfigUpdateResponse,
} from "@/lib/api/endpoints/admin-config.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

const api: { readonly adminConfig: IAdminConfigApi } = createApiContracts()

/**
 * Параметры useAdminConfig().
 */
export interface IUseAdminConfigArgs {
    /**
     * Включить/выключить автозагрузку.
     */
    readonly enabled?: boolean
}

/**
 * Входные данные для мутации обновления конфига.
 */
export interface IUpdateAdminConfigInput {
    /**
     * Новые значения конфига.
     */
    readonly values: IAdminConfigValues
    /**
     * ETag текущего снимка для If-Match.
     */
    readonly etag: number
}

/**
 * Результат useAdminConfig().
 */
export interface IUseAdminConfigResult {
    /**
     * Query конфигурации.
     */
    readonly configQuery: UseQueryResult<IAdminConfigResponse, Error>
    /**
     * Мутация обновления конфига с ETag.
     */
    readonly updateConfig: UseMutationResult<
        TAdminConfigUpdateResponse,
        Error,
        IUpdateAdminConfigInput
    >
}

/**
 * React Query хук для admin config с optimistic concurrency.
 *
 * Предоставляет query конфигурации и мутацию обновления
 * с передачей ETag через If-Match заголовок.
 *
 * @param args - Конфигурация загрузки.
 * @returns Query конфига и мутация обновления.
 */
export function useAdminConfig(args: IUseAdminConfigArgs = {}): IUseAdminConfigResult {
    const { enabled = true } = args
    const queryClient = useQueryClient()

    const configQuery = useQuery({
        queryKey: queryKeys.adminConfig.config(),
        queryFn: async (): Promise<IAdminConfigResponse> => {
            return api.adminConfig.getConfig()
        },
        enabled,
    })

    const updateConfig = useMutation<
        TAdminConfigUpdateResponse,
        Error,
        IUpdateAdminConfigInput
    >({
        mutationFn: async (
            input: IUpdateAdminConfigInput,
        ): Promise<TAdminConfigUpdateResponse> => {
            return api.adminConfig.updateConfig(input.values, input.etag)
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.adminConfig.all(),
            })
        },
    })

    return { configQuery, updateConfig }
}
