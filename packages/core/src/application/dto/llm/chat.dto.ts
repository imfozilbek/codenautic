import type {ITokenUsageDTO} from "../review/token-usage.dto"
import type {IMessageDTO, IToolCallDTO, IToolDefinitionDTO} from "./message.dto"

/**
 * LLM chat request payload.
 */
export interface IChatRequestDTO {
    readonly messages: readonly IMessageDTO[]
    readonly model: string
    readonly temperature?: number
    readonly maxTokens?: number
    readonly tools?: readonly IToolDefinitionDTO[]
}

/**
 * LLM chat response payload.
 */
export interface IChatResponseDTO {
    readonly content: string
    readonly toolCalls?: readonly IToolCallDTO[]
    readonly usage: ITokenUsageDTO
}
