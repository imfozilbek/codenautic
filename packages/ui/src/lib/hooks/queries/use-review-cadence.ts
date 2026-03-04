import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    IRepoConfigApi,
    IUpdateRepoConfigResponse,
    TRepoReviewMode,
} from "@/lib/api/endpoints/repo-config.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

/** Аргументы обновления cadence режима. */
export interface IUpdateReviewCadenceRequest {
    /** Идентификатор репозитория. */
    readonly repositoryId: string
    /** Новый cadence режим. */
    readonly reviewMode: TRepoReviewMode
}

/** Результат `useReviewCadence` hook. */
export interface IUseReviewCadenceResult {
    /** Мутация сохранения cadence mode. */
    readonly updateCadence: UseMutationResult<
        IUpdateRepoConfigResponse,
        Error,
        IUpdateReviewCadenceRequest
    >
}

const api: { readonly repoConfig: IRepoConfigApi } = createApiContracts()

/**
 * React Query hook для обновления review cadence режима.
 *
 * @returns Mutation API для сохранения cadence.
 */
export function useReviewCadence(): IUseReviewCadenceResult {
    const queryClient = useQueryClient()

    const updateCadence = useMutation({
        mutationFn: async (
            request: IUpdateReviewCadenceRequest,
        ): Promise<IUpdateRepoConfigResponse> => {
            return api.repoConfig.updateRepoConfig({
                repositoryId: request.repositoryId,
                reviewMode: request.reviewMode,
            })
        },
        onSuccess: async (response): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.repoConfig.byRepository(response.config.repositoryId),
            })
        },
    })

    return {
        updateCadence,
    }
}
