import type {Result} from "../../../shared/result"

/**
 * Inbound contract for application use cases.
 *
 * @template TInput Input payload type.
 * @template TOutput Success payload type.
 * @template TError Error payload type.
 */
export interface IUseCase<TInput, TOutput, TError extends Error> {
    /**
     * Executes use case scenario.
     *
     * @param input Use case input.
     * @returns Success or failure result.
     */
    execute(input: TInput): Promise<Result<TOutput, TError>>
}
