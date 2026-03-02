import type {ITokenUsageDTO} from "../review/token-usage.dto"

/**
 * Streaming chat chunk payload.
 */
export interface IChatChunkDTO {
    readonly delta: string
    readonly finishReason?: string
    readonly usage?: ITokenUsageDTO
}

/**
 * Streaming chat response contract.
 */
export type IStreamingChatResponseDTO = AsyncIterable<IChatChunkDTO>
