import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import type {
    ICodeReview,
    ICodeReviewApi,
    ISubmitCodeReviewFeedbackRequest,
    ISubmitCodeReviewFeedbackResponse,
    ITriggerCodeReviewRequest,
    ITriggerCodeReviewResponse,
} from "@/lib/api/endpoints/code-review.endpoint"
import { queryKeys } from "@/lib/query/query-keys"

const api: { readonly codeReview: ICodeReviewApi } = createApiContracts()

/** Параметры чтения конкретного review. */
export interface IUseCodeReviewQueryArgs {
    /** Идентификатор review. */
    readonly reviewId?: string
    /** Включить/выключить автозагрузку. */
    readonly enabled?: boolean
}

/** Возврат `useCodeReview` hook. */
export interface IUseCodeReviewResult {
    /** Query для получения состояния review. */
    readonly codeReviewQuery: UseQueryResult<ICodeReview, Error>
    /** Мутация на триггер нового review. */
    readonly triggerReview: UseMutationResult<
        ITriggerCodeReviewResponse,
        Error,
        ITriggerCodeReviewRequest
    >
    /** Мутация отправки feedback по найденным issues. */
    readonly submitFeedback: UseMutationResult<
        ISubmitCodeReviewFeedbackResponse,
        Error,
        ISubmitCodeReviewFeedbackRequest
    >
}

/**
 * Хук для работы с code review в UI.
 *
 * @param args Настройки.
 * @returns Состояние review + мутации запуска и feedback.
 */
export function useCodeReview(args: IUseCodeReviewQueryArgs = {}): IUseCodeReviewResult {
    const { enabled = true, reviewId } = args
    const queryClient = useQueryClient()
    const resolvedReviewId = reviewId?.trim() ?? ""
    const isQueryEnabled = enabled === true && resolvedReviewId.length > 0

    const codeReviewQuery = useQuery({
        queryKey: queryKeys.codeReview.byId(resolvedReviewId),
        queryFn: async (): Promise<ICodeReview> => {
            return api.codeReview.getCodeReview(resolvedReviewId)
        },
        enabled: isQueryEnabled,
        refetchOnWindowFocus: false,
    })

    const triggerReview = useMutation({
        mutationFn: async (request: ITriggerCodeReviewRequest): Promise<ITriggerCodeReviewResponse> => {
            return api.codeReview.triggerCodeReview(request)
        },
        onSuccess: async (response): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.codeReview.all(),
            })
            await queryClient.invalidateQueries({
                queryKey: queryKeys.codeReview.byId(response.reviewId),
            })
        },
    })

    const submitFeedback = useMutation({
        mutationFn: async (
            request: ISubmitCodeReviewFeedbackRequest,
        ): Promise<ISubmitCodeReviewFeedbackResponse> => {
            return api.codeReview.submitFeedback(request)
        },
        onSuccess: async (response): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.codeReview.byId(response.reviewId),
            })
        },
    })

    return {
        codeReviewQuery,
        triggerReview,
        submitFeedback,
    }
}
