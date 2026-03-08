import {describe, expect, test} from "bun:test"

import {
    CHAT_FINISH_REASON,
    CHAT_RESPONSE_FORMAT,
} from "../../../../src/application/dto/llm"
import {MESSAGE_ROLE} from "../../../../src/application/dto/llm/message.dto"
import type {IChatRequestDTO, IChatResponseDTO} from "../../../../src/application/dto/llm/chat.dto"

describe("LLM chat DTOs", () => {
    test("supports chat request payload", () => {
        const request: IChatRequestDTO = {
            messages: [
                {
                    role: MESSAGE_ROLE.SYSTEM,
                    content: "You are a strict code review assistant",
                },
                {
                    role: MESSAGE_ROLE.USER,
                    content: "Review this patch",
                },
            ],
            model: "gpt-5",
            temperature: 0.1,
            maxTokens: 800,
            tools: [
                {
                    name: "fetch_context",
                    description: "Fetch context for file segment",
                    parameters: {
                        type: "object",
                    },
                },
            ],
            responseFormat: {
                type: CHAT_RESPONSE_FORMAT.JSON_SCHEMA,
                name: "review_output",
                schema: {
                    type: "object",
                },
                strict: true,
            },
        }

        expect(request.messages).toHaveLength(2)
        expect(request.model).toBe("gpt-5")
        expect(request.responseFormat).toEqual({
            type: CHAT_RESPONSE_FORMAT.JSON_SCHEMA,
            name: "review_output",
            schema: {
                type: "object",
            },
            strict: true,
        })
    })

    test("supports chat response payload", () => {
        const response: IChatResponseDTO = {
            content: "I found two potential issues",
            toolCalls: [
                {
                    id: "call-1",
                    name: "fetch_context",
                    arguments: "{\"filePath\":\"src/main.ts\"}",
                },
            ],
            usage: {
                input: 1000,
                output: 250,
                total: 1250,
            },
            finishReason: CHAT_FINISH_REASON.TOOL_CALLS,
        }

        expect(response.content).toContain("issues")
        expect(response.usage.total).toBe(1250)
        expect(response.finishReason).toBe(CHAT_FINISH_REASON.TOOL_CALLS)
    })
})
