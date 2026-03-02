import {describe, expect, test} from "bun:test"

import {
    MESSAGE_ROLE,
    type IMessageDTO,
    type IToolCallDTO,
    type IToolDefinitionDTO,
} from "../../../../src/application/dto/llm/message.dto"

describe("LLM message DTOs", () => {
    test("supports message payload with role and optional fields", () => {
        const message: IMessageDTO = {
            role: MESSAGE_ROLE.ASSISTANT,
            content: "Please consider extracting this function",
            name: "review-assistant",
            toolCallId: "tool-call-1",
        }

        expect(message.role).toBe("assistant")
        expect(message.toolCallId).toBe("tool-call-1")
    })

    test("supports tool call and tool definition payloads", () => {
        const toolCall: IToolCallDTO = {
            id: "tool-call-1",
            name: "fetch_diff_context",
            arguments: "{\"filePath\":\"src/app.ts\",\"line\":10}",
        }
        const toolDefinition: IToolDefinitionDTO = {
            name: "fetch_diff_context",
            description: "Fetches diff context for line range",
            parameters: {
                type: "object",
                properties: {
                    filePath: {type: "string"},
                },
            },
        }

        expect(toolCall.name).toBe("fetch_diff_context")
        expect(toolDefinition.parameters).toHaveProperty("type", "object")
    })
})
