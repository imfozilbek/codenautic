import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IDryRunApi,
    ITriggerDryRunRequest,
    ITriggerDryRunResponse,
} from "@/lib/api/endpoints/dry-run.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

const api: { readonly dryRun: IDryRunApi } = createApiContracts()

/** Результат `useDryRun` hook. */
export interface IUseDryRunResult {
    /** Мутация запуска dry-run. */
    readonly runDryRun: UseMutationResult<ITriggerDryRunResponse, Error, ITriggerDryRunRequest>
}

/**
 * React Query hook для dry-run запуска и кэширования последнего результата.
 *
 * @returns Мутация запуска dry-run.
 */
export function useDryRun(): IUseDryRunResult {
    const queryClient = useQueryClient()

    const runDryRun = useMutation({
        mutationFn: async (request: ITriggerDryRunRequest): Promise<ITriggerDryRunResponse> => {
            return api.dryRun.triggerDryRun(request)
        },
        onSuccess: (response, request): void => {
            queryClient.setQueryData(
                queryKeys.dryRun.byRepository(request.repositoryId.trim()),
                response,
            )
        },
    })

    return {
        runDryRun,
    }
}
