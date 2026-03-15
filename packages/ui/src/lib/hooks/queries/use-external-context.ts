import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IExternalContextApi,
    IExternalContextPreviewResponse,
    IExternalContextSource,
    IExternalContextSourcesResponse,
    IRefreshExternalContextSourceResponse,
    IUpdateExternalContextSourceRequest,
    IUpdateExternalContextSourceResponse,
} from "@/lib/api/endpoints/external-context.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

type TExternalContextOptimisticContext = {
    readonly previousSources?: IExternalContextSourcesResponse
}

const api: { readonly externalContext: IExternalContextApi } = createApiContracts()

/** Параметры useExternalContext(). */
export interface IUseExternalContextArgs {
    /** Выбранный source id для preview-запроса. */
    readonly selectedSourceId?: string
    /** Включить/выключить запросы хука. */
    readonly enabled?: boolean
    /** Управлять preview-запросом независимо от list. */
    readonly previewEnabled?: boolean
}

/** Результат useExternalContext(). */
export interface IUseExternalContextResult {
    /** Запрос списка context sources. */
    readonly sourcesQuery: UseQueryResult<IExternalContextSourcesResponse, Error>
    /** Запрос preview выбранного source. */
    readonly previewQuery: UseQueryResult<IExternalContextPreviewResponse, Error>
    /** Мутация обновления source-конфига. */
    readonly updateSource: UseMutationResult<
        IUpdateExternalContextSourceResponse,
        Error,
        IUpdateExternalContextSourceRequest,
        TExternalContextOptimisticContext
    >
    /** Мутация refresh/sync для source. */
    readonly refreshSource: UseMutationResult<
        IRefreshExternalContextSourceResponse,
        Error,
        string,
        TExternalContextOptimisticContext
    >
}

function normalizeSourceId(sourceId: string | undefined): string {
    return sourceId?.trim() ?? ""
}

function replaceSourceInList(
    previousSources: IExternalContextSourcesResponse,
    source: IExternalContextSource,
): IExternalContextSourcesResponse {
    return {
        total: previousSources.total,
        sources: previousSources.sources.map((item): IExternalContextSource => {
            if (item.id !== source.id) {
                return item
            }
            return source
        }),
    }
}

/**
 * React Query hook для external context sources и preview.
 *
 * @param args Параметры списка/preview.
 * @returns Query + mutation API для управления внешним контекстом.
 */
export function useExternalContext(args: IUseExternalContextArgs = {}): IUseExternalContextResult {
    const { enabled = true, previewEnabled = true } = args
    const normalizedSourceId = normalizeSourceId(args.selectedSourceId)
    const queryClient = useQueryClient()
    const sourcesQueryKey = queryKeys.externalContext.sources()
    const previewQueryKey = queryKeys.externalContext.preview(normalizedSourceId)
    const isPreviewQueryEnabled =
        enabled === true && previewEnabled === true && normalizedSourceId.length > 0

    const sourcesQuery = useQuery({
        queryKey: sourcesQueryKey,
        queryFn: async (): Promise<IExternalContextSourcesResponse> => {
            return api.externalContext.listSources()
        },
        enabled,

    })

    const previewQuery = useQuery({
        queryKey: previewQueryKey,
        queryFn: async (): Promise<IExternalContextPreviewResponse> => {
            return api.externalContext.getPreview(normalizedSourceId)
        },
        enabled: isPreviewQueryEnabled,

    })

    const updateSource = useMutation<
        IUpdateExternalContextSourceResponse,
        Error,
        IUpdateExternalContextSourceRequest,
        TExternalContextOptimisticContext
    >({
        mutationFn: async (
            request: IUpdateExternalContextSourceRequest,
        ): Promise<IUpdateExternalContextSourceResponse> => {
            return api.externalContext.updateSource(request)
        },
        onMutate: async (
            request: IUpdateExternalContextSourceRequest,
        ): Promise<TExternalContextOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: sourcesQueryKey })
            const previousSources =
                queryClient.getQueryData<IExternalContextSourcesResponse>(sourcesQueryKey)
            if (previousSources === undefined) {
                return { previousSources }
            }

            if (request.enabled === undefined) {
                return { previousSources }
            }
            const nextEnabled = request.enabled

            queryClient.setQueryData<IExternalContextSourcesResponse>(sourcesQueryKey, {
                total: previousSources.total,
                sources: previousSources.sources.map((item): IExternalContextSource => {
                    if (item.id !== request.sourceId) {
                        return item
                    }
                    return {
                        ...item,
                        enabled: nextEnabled,
                    }
                }),
            })

            return { previousSources }
        },
        onError: (_error, _request, context): void => {
            if (context?.previousSources !== undefined) {
                queryClient.setQueryData(sourcesQueryKey, context.previousSources)
            }
        },
        onSuccess: (response): void => {
            const currentSources =
                queryClient.getQueryData<IExternalContextSourcesResponse>(sourcesQueryKey)
            if (currentSources === undefined) {
                return
            }

            queryClient.setQueryData(
                sourcesQueryKey,
                replaceSourceInList(currentSources, response.source),
            )
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey: sourcesQueryKey })
            if (normalizedSourceId.length > 0) {
                await queryClient.invalidateQueries({ queryKey: previewQueryKey })
            }
        },
    })

    const refreshSource = useMutation<
        IRefreshExternalContextSourceResponse,
        Error,
        string,
        TExternalContextOptimisticContext
    >({
        mutationFn: async (sourceId: string): Promise<IRefreshExternalContextSourceResponse> => {
            return api.externalContext.refreshSource(sourceId)
        },
        onMutate: async (sourceId): Promise<TExternalContextOptimisticContext> => {
            const normalizedId = normalizeSourceId(sourceId)
            await queryClient.cancelQueries({ queryKey: sourcesQueryKey })

            const previousSources =
                queryClient.getQueryData<IExternalContextSourcesResponse>(sourcesQueryKey)
            if (previousSources === undefined || normalizedId.length === 0) {
                return { previousSources }
            }

            queryClient.setQueryData<IExternalContextSourcesResponse>(sourcesQueryKey, {
                total: previousSources.total,
                sources: previousSources.sources.map((item): IExternalContextSource => {
                    if (item.id !== normalizedId) {
                        return item
                    }
                    return {
                        ...item,
                        status: "SYNCING",
                    }
                }),
            })

            return { previousSources }
        },
        onError: (_error, _request, context): void => {
            if (context?.previousSources !== undefined) {
                queryClient.setQueryData(sourcesQueryKey, context.previousSources)
            }
        },
        onSuccess: (response, sourceId): void => {
            const currentSources =
                queryClient.getQueryData<IExternalContextSourcesResponse>(sourcesQueryKey)
            if (currentSources === undefined) {
                return
            }

            const normalizedId = normalizeSourceId(sourceId)
            queryClient.setQueryData<IExternalContextSourcesResponse>(sourcesQueryKey, {
                total: currentSources.total,
                sources: currentSources.sources.map((item): IExternalContextSource => {
                    if (item.id !== normalizedId) {
                        return item
                    }
                    return {
                        ...item,
                        status: response.status,
                    }
                }),
            })
        },
        onSettled: async (_response, _error, sourceId): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey: sourcesQueryKey })
            const normalizedId = normalizeSourceId(sourceId)
            if (normalizedId.length > 0) {
                await queryClient.invalidateQueries({
                    queryKey: queryKeys.externalContext.preview(normalizedId),
                })
            }
        },
    })

    return {
        sourcesQuery,
        previewQuery,
        updateSource,
        refreshSource,
    }
}
