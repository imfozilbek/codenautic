import {describe, expect, test} from "bun:test"

import type {IChatChunkDTO, IStreamingChatResponseDTO} from "../../../../src/application/dto/llm"

describe("IStreamingChatResponseDTO", () => {
    test("supports async iterable chat chunks", async () => {
        const stream: IStreamingChatResponseDTO = (async function* (): AsyncGenerator<IChatChunkDTO> {
            await Promise.resolve()
            yield {
                delta: "Hello",
            }
            yield {
                delta: " world",
                finishReason: "stop",
                usage: {
                    input: 10,
                    output: 5,
                    total: 15,
                },
            }
        })()

        const chunks: IChatChunkDTO[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(chunks).toHaveLength(2)
        expect(chunks[1]?.finishReason).toBe("stop")
        expect(chunks[1]?.usage?.total).toBe(15)
    })
})
