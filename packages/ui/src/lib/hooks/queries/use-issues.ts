import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IIssue,
    IIssuesApi,
    IIssuesListResponse,
    IPerformIssueActionRequest,
    IPerformIssueActionResponse,
    TIssueSeverity,
    TIssueStatus,
} from "@/lib/api/endpoints/issues.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

/** Контекст для optimistic updates issues. */
type TIssuesOptimisticContext = {
    readonly previousList?: IIssuesListResponse
}

const api: { readonly issues: IIssuesApi } = createApiContracts()

/** Параметры запроса issues. */
export interface IUseIssuesQueryArgs {
    /** Фильтр по статусу. */
    readonly status?: TIssueStatus
    /** Фильтр по критичности. */
    readonly severity?: TIssueSeverity
    /** Поиск по тексту. */
    readonly search?: string
    /** Включить/выключить запрос. */
    readonly enabled?: boolean
}

/** Результат хука useIssues(). */
export interface IUseIssuesResult {
    /** Запрос списка issues. */
    readonly issuesQuery: UseQueryResult<IIssuesListResponse, Error>
    /** Выполнение действия над issue. */
    readonly performAction: UseMutationResult<
        IPerformIssueActionResponse,
        Error,
        IPerformIssueActionRequest,
        TIssuesOptimisticContext
    >
}

/**
 * React Query hook для issues с optimistic updates на действия.
 *
 * @param args Параметры запроса и фильтрации.
 * @returns Запрос списка и мутация действия.
 */
export function useIssues(args: IUseIssuesQueryArgs = {}): IUseIssuesResult {
    const { enabled = true, status, severity, search } = args
    const queryClient = useQueryClient()
    const listQueryKey = queryKeys.issues.list(status, severity, search)

    const issuesQuery = useQuery({
        queryKey: listQueryKey,
        queryFn: async (): Promise<IIssuesListResponse> => {
            return api.issues.listIssues({ status, severity, search })
        },
        enabled,
    })

    const performAction = useMutation<
        IPerformIssueActionResponse,
        Error,
        IPerformIssueActionRequest,
        TIssuesOptimisticContext
    >({
        mutationFn: async (
            request: IPerformIssueActionRequest,
        ): Promise<IPerformIssueActionResponse> => {
            return api.issues.performAction(request)
        },
        onMutate: async (request): Promise<TIssuesOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: queryKeys.issues.all() })

            const previousList = queryClient.getQueryData<IIssuesListResponse>(listQueryKey)
            if (previousList === undefined) {
                return { previousList }
            }

            const updatedIssues = previousList.issues.map((issue): IIssue => {
                if (issue.id !== request.id) {
                    return issue
                }

                return applyIssueAction(issue, request.action)
            })

            queryClient.setQueryData<IIssuesListResponse>(listQueryKey, {
                issues: updatedIssues,
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
            await queryClient.invalidateQueries({ queryKey: queryKeys.issues.all() })
        },
    })

    return {
        issuesQuery,
        performAction,
    }
}

/**
 * Применяет действие к issue для optimistic update.
 *
 * @param issue Исходная проблема.
 * @param action Действие для применения.
 * @returns Обновлённая проблема.
 */
function applyIssueAction(issue: IIssue, action: IPerformIssueActionRequest["action"]): IIssue {
    if (action === "fix") {
        return { ...issue, status: "fixed" }
    }
    if (action === "ignore") {
        return { ...issue, status: "dismissed" }
    }
    if (action === "snooze") {
        return { ...issue, status: "dismissed" }
    }
    if (action === "acknowledge") {
        return { ...issue, status: "in_progress" }
    }
    return issue
}
