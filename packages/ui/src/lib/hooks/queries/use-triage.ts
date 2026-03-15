import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IPerformTriageActionRequest,
    IPerformTriageActionResponse,
    ITriageApi,
    ITriageItem,
    ITriageListResponse,
    TTriageScope,
} from "@/lib/api/endpoints/triage.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

/** Контекст для optimistic updates triage. */
type TTriageOptimisticContext = {
    readonly previousList?: ITriageListResponse
}

const api: { readonly triage: ITriageApi } = createApiContracts()

/** Параметры запроса triage. */
export interface IUseTriageQueryArgs {
    /** Scope фильтрации (mine/team/repo). */
    readonly scope?: TTriageScope
    /** Включить/выключить запрос. */
    readonly enabled?: boolean
}

/** Результат хука useTriage(). */
export interface IUseTriageResult {
    /** Запрос списка triage items. */
    readonly triageQuery: UseQueryResult<ITriageListResponse, Error>
    /** Выполнение действия над triage item. */
    readonly performAction: UseMutationResult<
        IPerformTriageActionResponse,
        Error,
        IPerformTriageActionRequest,
        TTriageOptimisticContext
    >
}

/**
 * React Query hook для triage items с optimistic updates на действия.
 *
 * @param args Параметры запроса и фильтрации.
 * @returns Запрос списка и мутация действия.
 */
export function useTriage(args: IUseTriageQueryArgs = {}): IUseTriageResult {
    const { enabled = true, scope } = args
    const queryClient = useQueryClient()
    const listQueryKey = queryKeys.triage.list(scope)

    const triageQuery = useQuery({
        queryKey: listQueryKey,
        queryFn: async (): Promise<ITriageListResponse> => {
            return api.triage.listItems({ scope })
        },
        enabled,
    })

    const performAction = useMutation<
        IPerformTriageActionResponse,
        Error,
        IPerformTriageActionRequest,
        TTriageOptimisticContext
    >({
        mutationFn: async (
            request: IPerformTriageActionRequest,
        ): Promise<IPerformTriageActionResponse> => {
            return api.triage.performAction(request)
        },
        onMutate: async (request): Promise<TTriageOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: queryKeys.triage.all() })

            const previousList = queryClient.getQueryData<ITriageListResponse>(listQueryKey)
            if (previousList === undefined) {
                return { previousList }
            }

            const updatedItems = previousList.items.map((item): ITriageItem => {
                if (item.id !== request.id) {
                    return item
                }

                return applyTriageAction(item, request.action)
            })

            queryClient.setQueryData<ITriageListResponse>(listQueryKey, {
                items: updatedItems,
                total: previousList.total,
            })

            return { previousList }
        },
        onError: (_error, _request, context): void => {
            if (context?.previousList !== undefined) {
                queryClient.setQueryData(listQueryKey, context.previousList)
            }
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.triage.all() })
        },
    })

    return {
        triageQuery,
        performAction,
    }
}

/**
 * Применяет действие к triage item для optimistic update.
 *
 * @param item Исходный triage item.
 * @param action Действие для применения.
 * @returns Обновлённый triage item.
 */
function applyTriageAction(
    item: ITriageItem,
    action: IPerformTriageActionRequest["action"],
): ITriageItem {
    if (action === "assign_to_me") {
        return {
            ...item,
            owner: "me",
            status: item.status === "unassigned" ? "assigned" : item.status,
        }
    }
    if (action === "mark_read") {
        return { ...item, isRead: true }
    }
    if (action === "snooze") {
        return { ...item, status: "snoozed" }
    }
    if (action === "start_work") {
        return {
            ...item,
            owner: item.owner === "unassigned" ? "me" : item.owner,
            status: "in_progress",
        }
    }
    if (action === "mark_done") {
        return { ...item, status: "done" }
    }
    if (action === "escalate") {
        return {
            ...item,
            escalationLevel: item.escalationLevel === "none" ? "warn" : "critical",
            status: item.status === "done" ? item.status : "blocked",
        }
    }
    return item
}
