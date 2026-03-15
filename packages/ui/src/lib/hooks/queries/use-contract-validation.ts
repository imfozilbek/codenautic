import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type { IContractValidationApi } from "@/lib/api/endpoints/contract-validation.endpoint"
import type {
    IArchitectureGraphResponse,
    IBlueprintResponse,
    IDriftTrendResponse,
    IDriftViolationsResponse,
    IGuardrailsResponse,
    IUpdateYamlResponse,
} from "@/lib/api/endpoints/contract-validation.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

/**
 * Контекст для optimistic update blueprint/guardrails.
 */
type TYamlOptimisticContext = {
    readonly previousYaml?: string
}

const api: { readonly contractValidation: IContractValidationApi } = createApiContracts()

/**
 * Параметры хука useContractValidation().
 */
export interface IUseContractValidationArgs {
    /**
     * Включить/выключить все запросы.
     */
    readonly enabled?: boolean
}

/**
 * Результат хука useContractValidation().
 */
export interface IUseContractValidationResult {
    /**
     * Запрос blueprint YAML.
     */
    readonly blueprintQuery: UseQueryResult<IBlueprintResponse, Error>
    /**
     * Запрос guardrails YAML.
     */
    readonly guardrailsQuery: UseQueryResult<IGuardrailsResponse, Error>
    /**
     * Запрос drift-нарушений.
     */
    readonly violationsQuery: UseQueryResult<IDriftViolationsResponse, Error>
    /**
     * Запрос тренда drift-нарушений.
     */
    readonly trendQuery: UseQueryResult<IDriftTrendResponse, Error>
    /**
     * Запрос графа архитектуры.
     */
    readonly graphQuery: UseQueryResult<IArchitectureGraphResponse, Error>
    /**
     * Мутация обновления blueprint YAML.
     */
    readonly updateBlueprint: UseMutationResult<
        IUpdateYamlResponse,
        Error,
        string,
        TYamlOptimisticContext
    >
    /**
     * Мутация обновления guardrails YAML.
     */
    readonly updateGuardrails: UseMutationResult<
        IUpdateYamlResponse,
        Error,
        string,
        TYamlOptimisticContext
    >
}

/**
 * React Query hook для contract validation: blueprint, guardrails,
 * drift-нарушения, тренд и граф архитектуры.
 *
 * @param args - Параметры запросов.
 * @returns Запросы и мутации для contract validation.
 */
export function useContractValidation(
    args: IUseContractValidationArgs = {},
): IUseContractValidationResult {
    const { enabled = true } = args
    const queryClient = useQueryClient()

    const blueprintQueryKey = queryKeys.contractValidation.blueprint()
    const guardrailsQueryKey = queryKeys.contractValidation.guardrails()

    const blueprintQuery = useQuery({
        queryKey: blueprintQueryKey,
        queryFn: async (): Promise<IBlueprintResponse> => {
            return api.contractValidation.getBlueprint()
        },
        enabled,
    })

    const guardrailsQuery = useQuery({
        queryKey: guardrailsQueryKey,
        queryFn: async (): Promise<IGuardrailsResponse> => {
            return api.contractValidation.getGuardrails()
        },
        enabled,
    })

    const violationsQuery = useQuery({
        queryKey: queryKeys.contractValidation.violations(),
        queryFn: async (): Promise<IDriftViolationsResponse> => {
            return api.contractValidation.getDriftViolations()
        },
        enabled,
    })

    const trendQuery = useQuery({
        queryKey: queryKeys.contractValidation.trend(),
        queryFn: async (): Promise<IDriftTrendResponse> => {
            return api.contractValidation.getDriftTrend()
        },
        enabled,
    })

    const graphQuery = useQuery({
        queryKey: queryKeys.contractValidation.graph(),
        queryFn: async (): Promise<IArchitectureGraphResponse> => {
            return api.contractValidation.getArchitectureGraph()
        },
        enabled,
    })

    const updateBlueprint = useMutation<
        IUpdateYamlResponse,
        Error,
        string,
        TYamlOptimisticContext
    >({
        mutationFn: async (yaml: string): Promise<IUpdateYamlResponse> => {
            return api.contractValidation.updateBlueprint(yaml)
        },
        onMutate: async (yaml): Promise<TYamlOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: blueprintQueryKey })
            const previous = queryClient.getQueryData<IBlueprintResponse>(blueprintQueryKey)

            queryClient.setQueryData<IBlueprintResponse>(blueprintQueryKey, { yaml })

            return { previousYaml: previous?.yaml }
        },
        onError: (_error, _yaml, context): void => {
            if (context?.previousYaml !== undefined) {
                queryClient.setQueryData<IBlueprintResponse>(blueprintQueryKey, {
                    yaml: context.previousYaml,
                })
            }
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.contractValidation.all(),
            })
        },
    })

    const updateGuardrails = useMutation<
        IUpdateYamlResponse,
        Error,
        string,
        TYamlOptimisticContext
    >({
        mutationFn: async (yaml: string): Promise<IUpdateYamlResponse> => {
            return api.contractValidation.updateGuardrails(yaml)
        },
        onMutate: async (yaml): Promise<TYamlOptimisticContext> => {
            await queryClient.cancelQueries({ queryKey: guardrailsQueryKey })
            const previous = queryClient.getQueryData<IGuardrailsResponse>(guardrailsQueryKey)

            queryClient.setQueryData<IGuardrailsResponse>(guardrailsQueryKey, { yaml })

            return { previousYaml: previous?.yaml }
        },
        onError: (_error, _yaml, context): void => {
            if (context?.previousYaml !== undefined) {
                queryClient.setQueryData<IGuardrailsResponse>(guardrailsQueryKey, {
                    yaml: context.previousYaml,
                })
            }
        },
        onSettled: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.contractValidation.all(),
            })
        },
    })

    return {
        blueprintQuery,
        guardrailsQuery,
        violationsQuery,
        trendQuery,
        graphQuery,
        updateBlueprint,
        updateGuardrails,
    }
}
