import {
    useMutation,
    useQuery,
    useQueryClient,
    type QueryClient,
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
    query: TCustomRulesQuery,
): ICustomRulesListResponse {
    if (
        doesRuleMatchQuery(
            {
                ...request,
                id: "optimistic-custom-rule",
            },
            query,
        ) !== true
    ) {
        return queryResult
    }

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

function doesRuleMatchQuery(rule: ICustomRule, query: TCustomRulesQuery): boolean {
    if (query.scope !== undefined && rule.scope !== query.scope) {
        return false
    }

    if (query.status !== undefined && rule.status !== query.status) {
        return false
    }

    return true
}

function replaceRuleInList(
    queryResult: ICustomRulesListResponse,
    rule: ICustomRule,
    query: TCustomRulesQuery,
): ICustomRulesListResponse {
    const ruleMatchesQuery = doesRuleMatchQuery(rule, query)
    const hasExistingRule = queryResult.rules.some((item): boolean => item.id === rule.id)

    if (ruleMatchesQuery !== true) {
        if (hasExistingRule !== true) {
            return queryResult
        }

        const nextRules = queryResult.rules.filter((item): boolean => item.id !== rule.id)
        return {
            total: Math.max(queryResult.total - 1, 0),
            rules: nextRules,
        }
    }

    if (hasExistingRule !== true) {
        return {
            total: queryResult.total + 1,
            rules: [...queryResult.rules, rule],
        }
    }

    return {
        total: queryResult.total,
        rules: queryResult.rules.map((item): ICustomRule => {
            if (item.id !== rule.id) {
                return item
            }

            return rule
        }),
    }
}

async function invalidateCustomRuleQueries(queryClient: QueryClient): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: queryKeys.customRules.all() })
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
            await queryClient.cancelQueries({ queryKey: queryKeys.customRules.all() })

            const previousList = queryClient.getQueryData<ICustomRulesListResponse>(listQueryKey)
            if (previousList === undefined) {
                return { previousList }
            }

            const optimisticList = upsertOptimisticRule(request, previousList, queryFilters)
            const optimisticRuleId =
                optimisticList === previousList ? undefined : optimisticList.rules.at(-1)?.id
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
            await invalidateCustomRuleQueries(queryClient)
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
            await queryClient.cancelQueries({ queryKey: queryKeys.customRules.all() })

            const previousList = queryClient.getQueryData<ICustomRulesListResponse>(listQueryKey)
            if (previousList === undefined) {
                return { previousList }
            }

            const currentRule = previousList.rules.find((item): boolean => item.id === request.id)
            if (currentRule !== undefined) {
                queryClient.setQueryData<ICustomRulesListResponse>(
                    listQueryKey,
                    replaceRuleInList(
                        previousList,
                        {
                            ...currentRule,
                            title: request.title ?? currentRule.title,
                            rule: request.rule ?? currentRule.rule,
                            type: request.type ?? currentRule.type,
                            scope: request.scope ?? currentRule.scope,
                            severity: request.severity ?? currentRule.severity,
                            status: request.status ?? currentRule.status,
                            examples: request.examples ?? currentRule.examples,
                        },
                        queryFilters,
                    ),
                )
            }

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

            queryClient.setQueryData<ICustomRulesListResponse>(
                listQueryKey,
                replaceRuleInList(currentList, response, queryFilters),
            )
        },
        onSettled: async (): Promise<void> => {
            await invalidateCustomRuleQueries(queryClient)
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
            await queryClient.cancelQueries({ queryKey: queryKeys.customRules.all() })

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
            await invalidateCustomRuleQueries(queryClient)
        },
    })

    return {
        customRulesQuery,
        createRule,
        updateRule,
        deleteRule,
    }
}
