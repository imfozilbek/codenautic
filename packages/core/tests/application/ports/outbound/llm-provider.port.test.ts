import {describe, expect, test} from "bun:test"

import {
    CHAT_FINISH_REASON,
    CHAT_RESPONSE_FORMAT,
    MESSAGE_ROLE,
    type IChatChunkDTO,
    type IChatRequestDTO,
    type IChatResponseDTO,
    type ILLMProvider,
    type IStreamingChatResponseDTO,
} from "../../../../src"

class InMemoryLLMProvider implements ILLMProvider {
    public chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
        return Promise.resolve({
            content: `processed:${request.messages.length}`,
            usage: {
                input: 100,
                output: 20,
                total: 120,
            },
            finishReason: CHAT_FINISH_REASON.STOP,
        })
    }

    public stream(_request: IChatRequestDTO): IStreamingChatResponseDTO {
        return (async function* (): AsyncGenerator<IChatChunkDTO> {
            await Promise.resolve()
            yield {
                delta: "processed",
            }
            yield {
                delta: ":done",
                finishReason: "stop",
                usage: {
                    input: 100,
                    output: 20,
                    total: 120,
                },
            }
        })()
    }

    public embed(texts: readonly string[]): Promise<readonly number[][]> {
        return Promise.resolve(
            texts.map((text) => {
                return [text.length, text.length / 2]
            }),
        )
    }
}

describe("ILLMProvider contract", () => {
    test("supports chat and embed operations", async () => {
        const provider = new InMemoryLLMProvider()
        const request: IChatRequestDTO = {
            messages: [
                {
                    role: MESSAGE_ROLE.USER,
                    content: "Analyze this patch",
                },
            ],
            model: "gpt-5",
            responseFormat: {
                type: CHAT_RESPONSE_FORMAT.JSON_OBJECT,
            },
        }

        const response = await provider.chat(request)
        const embeddings = await provider.embed(["first", "second"])

        expect(response.content).toBe("processed:1")
        expect(response.usage.total).toBe(120)
        expect(response.finishReason).toBe(CHAT_FINISH_REASON.STOP)
        expect(embeddings).toHaveLength(2)
        expect(embeddings[0]?.[0]).toBe(5)
    })

    test("supports streaming operation", async () => {
        const provider = new InMemoryLLMProvider()
        const request: IChatRequestDTO = {
            messages: [
                {
                    role: MESSAGE_ROLE.USER,
                    content: "Stream result",
                },
            ],
            model: "gpt-5",
        }
        const chunks: IChatChunkDTO[] = []

        for await (const chunk of provider.stream(request)) {
            chunks.push(chunk)
        }

        expect(chunks).toHaveLength(2)
        expect(chunks[1]?.finishReason).toBe("stop")
    })
})
