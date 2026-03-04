import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    ICreateCustomRuleRequest,
    ICustomRule,
    ICustomRulesApi,
    ICustomRulesListResponse,
    IDeleteCustomRuleRequest,
    IDeleteCustomRuleResponse,
    IUpdateCustomRuleRequest,
    TCustomRuleScope,
    TCustomRuleStatus,
} from "@/lib/api/endpoints/custom-rules.endpoint"
import {
    CUSTOM_RULE_SCOPE,
    CUSTOM_RULE_STATUS,
} from "@/lib/api/endpoints/custom-rules.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

type TCustomRulesQuery = {
    readonly scope?: TCustomRuleScope
    readonly status?: TCustomRuleStatus
}

type TOptimisticContext = {
    readonly previousList?: ICustomRulesListResponse
    readonly tempId?: string
}

const api: { readonly customRules: ICustomRulesApi } = createApiContracts()

/** Параметры запроса custom rules. */
export interface IUseCustomRulesQueryArgs {
    /** Фильтр по scope, например FILE/CCR. */
    readonly scope?: TCustomRuleScope
    /** Фильтр по статусу, например ACTIVE/PENDING. */
    readonly status?: TCustomRuleStatus
    /** Включить/выключить запрос. */
    readonly enabled?: boolean
}

/** Результат хука useCustomRules(). */
export interface IUseCustomRulesResult {
    /** Запрос списка custom rules. */
    readonly customRulesQuery: UseQueryResult<ICustomRulesListResponse, Error>
    /** Создание нового правила. */
    readonly createRule: UseMutationResult<
        ICustomRule,
        Error,
        ICreateCustomRuleRequest,
        TOptimisticContext
    >
    /** Обновление существующего правила. */
    readonly updateRule: UseMutationResult<
        ICustomRule,
        Error,
        IUpdateCustomRuleRequest,
        TOptimisticContext
    >
    /** Удаление существующего правила. */
    readonly deleteRule: UseMutationResult<
        IDeleteCustomRuleResponse,
        Error,
        IDeleteCustomRuleRequest,
        TOptimisticContext
    >
}

function normalizeRuleQuery<TValue extends string>(
    value: string | undefined,
    allowed: readonly TValue[],
): TValue | undefined {
    const normalized = value?.trim().toUpperCase()
    if (normalized === undefined || normalized.length === 0) {
        return undefined
    }

    return allowed.find((allowedValue): boolean => allowedValue === normalized)
}

function upsertOptimisticRule(
    request: ICreateCustomRuleRequest,
    queryResult: ICustomRulesListResponse,
): ICustomRulesListResponse {
    const optimisticRule: ICustomRule = {
        id: `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        title: request.title,
        rule: request.rule,
        type: request.type,
        scope: request.scope,
        severity: request.severity,
        status: request.status,
        examples: request.examples,
    }

    return {
        total: queryResult.total + 1,
        rules: [...queryResult.rules, optimisticRule],
    }
}

/**
 * React Query hook для CRUD-операций над custom rules с optimistic updates.
 *
 * @param args Параметры запроса/мутаций.
 * @returns Запрос списка и мутации create/update/delete.
 */
export function useCustomRules(args: IUseCustomRulesQueryArgs = {}): IUseCustomRulesResult {
    const { enabled = true, scope, status } = args
    const queryClient = useQueryClient()
    const normalizedScope = normalizeRuleQuery<TCustomRuleScope>(
        scope,
        Object.values(CUSTOM_RULE_SCOPE) as readonly TCustomRuleScope[],
    )
    const normalizedStatus = normalizeRuleQuery<TCustomRuleStatus>(
        status,
        Object.values(CUSTOM_RULE_STATUS) as readonly TCustomRuleStatus[],
    )
    const queryFilters: TCustomRulesQuery = {
        scope: normalizedScope,
        status: normalizedStatus,
    }
    const listQueryKey = queryKeys.customRules.list(queryFilters.scope, queryFilters.status)

    const customRulesQuery = useQuery({
        queryKey: listQueryKey,
        queryFn: async (): Promise<ICustomRulesListResponse> => {
            return api.customRules.listCustomRules({
                scope: queryFilters.scope,
                status: queryFilters.status,
            })
        },
        enabled,
        refetchOnWindowFocus: false,
    })

    const createRule = useMutation<
        ICustomRule,
        Error,
        ICreateCustomRuleRequest,
        TOptimisticContext
    >({
        mutationFn: async (request: ICreateCustomRuleRequest): Promise<ICustomRule> => {
            return api.customRules.createCustomRule(request)
        },
        onMutate: async (request): Promise<TOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: listQueryKey })

            const previousList = queryClient.getQueryData<ICustomRulesListResponse>(listQueryKey)
            if (previousList === undefined) {
                return { previousList }
            }

            const optimisticList = upsertOptimisticRule(request, previousList)
            const optimisticRuleId = optimisticList.rules.at(-1)?.id
            queryClient.setQueryData(listQueryKey, optimisticList)

            return {
                previousList,
                tempId: optimisticRuleId,
            }
        },
        onError: (_error, _request, context): void => {
            if (context?.previousList !== undefined) {
                queryClient.setQueryData(listQueryKey, context.previousList)
            }
        },
        onSuccess: (response, _request, context): void => {
            const currentList = queryClient.getQueryData<ICustomRulesListResponse>(listQueryKey)
            if (currentList === undefined || context?.tempId === undefined) {
                return
            }

            queryClient.setQueryData<ICustomRulesListResponse>(listQueryKey, {
                total: currentList.total,
                rules: currentList.rules.map((item): ICustomRule => {
                    if (item.id === context.tempId) {
                        return response
                    }
                    return item
                }),
            })
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey: listQueryKey })
        },
    })

    const updateRule = useMutation<
        ICustomRule,
        Error,
        IUpdateCustomRuleRequest,
        TOptimisticContext
    >({
        mutationFn: async (request: IUpdateCustomRuleRequest): Promise<ICustomRule> => {
            return api.customRules.updateCustomRule(request)
        },
        onMutate: async (request): Promise<TOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: listQueryKey })

            const previousList = queryClient.getQueryData<ICustomRulesListResponse>(listQueryKey)
            if (previousList === undefined) {
                return { previousList }
            }

            queryClient.setQueryData<ICustomRulesListResponse>(listQueryKey, {
                total: previousList.total,
                rules: previousList.rules.map((item): ICustomRule => {
                    if (item.id !== request.id) {
                        return item
                    }
                    return {
                        ...item,
                        title: request.title ?? item.title,
                        rule: request.rule ?? item.rule,
                        type: request.type ?? item.type,
                        scope: request.scope ?? item.scope,
                        severity: request.severity ?? item.severity,
                        status: request.status ?? item.status,
                        examples: request.examples ?? item.examples,
                    }
                }),
            })

            return {
                previousList,
                tempId: request.id,
            }
        },
        onError: (_error, _request, context): void => {
            if (context?.previousList !== undefined) {
                queryClient.setQueryData(listQueryKey, context.previousList)
            }
        },
        onSuccess: (response): void => {
            const currentList = queryClient.getQueryData<ICustomRulesListResponse>(listQueryKey)
            if (currentList === undefined) {
                return
            }

            queryClient.setQueryData<ICustomRulesListResponse>(listQueryKey, {
                total: currentList.total,
                rules: currentList.rules.map((item): ICustomRule => {
                    if (item.id !== response.id) {
                        return item
                    }
                    return response
                }),
            })
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey: listQueryKey })
        },
    })

    const deleteRule = useMutation<
        IDeleteCustomRuleResponse,
        Error,
        IDeleteCustomRuleRequest,
        TOptimisticContext
    >({
        mutationFn: async (
            request: IDeleteCustomRuleRequest,
        ): Promise<IDeleteCustomRuleResponse> => {
            return api.customRules.deleteCustomRule(request)
        },
        onMutate: async (request): Promise<TOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: listQueryKey })

            const previousList = queryClient.getQueryData<ICustomRulesListResponse>(listQueryKey)
            if (previousList === undefined) {
                return { previousList }
            }

            const nextRules = previousList.rules.filter((item): boolean => item.id !== request.id)
            queryClient.setQueryData<ICustomRulesListResponse>(listQueryKey, {
                total: Math.max(previousList.total - 1, 0),
                rules: nextRules,
            })

            return {
                previousList,
                tempId: request.id,
            }
        },
        onError: (_error, _request, context): void => {
            if (context?.previousList !== undefined) {
                queryClient.setQueryData(listQueryKey, context.previousList)
            }
        },
        onSuccess: (response, _request, context): void => {
            if (response.removed === true) {
                return
            }

            if (context?.previousList !== undefined) {
                queryClient.setQueryData(listQueryKey, context.previousList)
            }
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({ queryKey: listQueryKey })
        },
    })

    return {
        customRulesQuery,
        createRule,
        updateRule,
        deleteRule,
    }
}
