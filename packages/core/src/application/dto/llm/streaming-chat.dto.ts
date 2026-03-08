import type {ChatFinishReason} from "./chat-finish-reason.dto"
import type {ITokenUsageDTO} from "../review/token-usage.dto"

/**
 * Streaming chat chunk payload.
 */
export interface IChatChunkDTO {
    readonly delta: string
    readonly finishReason?: ChatFinishReason
    readonly usage?: ITokenUsageDTO
}

/**
 * Streaming chat response contract.
 */
export type IStreamingChatResponseDTO = AsyncIterable<IChatChunkDTO>
