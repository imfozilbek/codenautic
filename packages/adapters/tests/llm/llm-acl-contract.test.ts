import {describe, expect, test} from "bun:test"

import {
    CHAT_FINISH_REASON,
    CHAT_RESPONSE_FORMAT,
} from "@codenautic/core"

import {
    AnthropicRequestAcl,
    AnthropicResponseAcl,
    LLM_ACL_PROVIDER,
    OpenAiRequestAcl,
    OpenAiResponseAcl,
    normalizeLlmProviderRequest,
    normalizeLlmProviderResponse,
} from "../../src/llm/acl"

describe("LLM ACL contract", () => {
    test("normalizes OpenAI request from shared DTO", () => {
        const normalized = normalizeLlmProviderRequest(LLM_ACL_PROVIDER.OPENAI, {
            model: " gpt-4o ",
            temperature: 2.5,
            maxTokens: 300,
            messages: [
                {
                    role: "system",
                    content: " system rules ",
                },
                {
                    role: "user",
                    content: " hello ",
                },
            ],
            tools: [
                {
                    name: "calc",
                    description: "calculator",
                    parameters: {
                        type: "object",
                    },
                },
            ],
            responseFormat: {
                type: CHAT_RESPONSE_FORMAT.JSON_OBJECT,
            },
        })

        expect(normalized).toEqual({
            model: "gpt-4o",
            temperature: 2,
            max_tokens: 300,
            messages: [
                {
                    role: "system",
                    content: "system rules",
                    name: undefined,
                    toolCallId: undefined,
                },
                {
                    role: "user",
                    content: "hello",
                    name: undefined,
                    toolCallId: undefined,
                },
            ],
            tools: [
                {
                    type: "function",
                    function: {
                        name: "calc",
                        description: "calculator",
                        parameters: {
                            type: "object",
                        },
                    },
                },
            ],
            response_format: {
                type: "json_object",
            },
        })
    })

    test("normalizes OpenAI request with text response format", () => {
        const normalized = normalizeLlmProviderRequest(LLM_ACL_PROVIDER.OPENAI, {
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: "plain text only",
                },
            ],
            responseFormat: {
                type: CHAT_RESPONSE_FORMAT.TEXT,
            },
        })

        expect(normalized.response_format).toEqual({
            type: "text",
        })
    })

    test("normalizes OpenAI request with JSON schema response format", () => {
        const normalized = normalizeLlmProviderRequest(LLM_ACL_PROVIDER.OPENAI, {
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: "return typed json",
                },
            ],
            responseFormat: {
                type: CHAT_RESPONSE_FORMAT.JSON_SCHEMA,
                name: " review_summary ",
                description: " typed response ",
                strict: true,
                schema: {
                    type: "object",
                    additionalProperties: false,
                },
            },
        })

        expect(normalized.response_format).toEqual({
            type: "json_schema",
            json_schema: {
                name: "review_summary",
                description: "typed response",
                strict: true,
                schema: {
                    type: "object",
                    additionalProperties: false,
                },
            },
        })
    })

    test("normalizes Anthropic request with fallback model and system extraction", () => {
        const normalized = normalizeLlmProviderRequest(
            LLM_ACL_PROVIDER.ANTHROPIC,
            {
                model: " ",
                maxTokens: undefined,
                temperature: -5,
                messages: [
                    {
                        role: "system",
                        content: " Be brief ",
                    },
                    {
                        role: "user",
                        content: " question ",
                    },
                    {
                        role: "assistant",
                        content: " answer ",
                    },
                    {
                        role: "tool",
                        content: "ignored tool message",
                    },
                ],
                tools: [
                    {
                        name: "search",
                        description: "search docs",
                        parameters: {
                            type: "object",
                            properties: {
                                q: {
                                    type: "string",
                                },
                            },
                        },
                    },
                ],
            },
            {
                fallbackModelByProvider: {
                    ANTHROPIC: "claude-3-5-sonnet",
                },
                anthropicDefaultMaxTokens: 2048,
            },
        )

        expect(normalized).toEqual({
            model: "claude-3-5-sonnet",
            system: "Be brief",
            max_tokens: 2048,
            temperature: 0,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "question",
                        },
                    ],
                },
                {
                    role: "assistant",
                    content: [
                        {
                            type: "text",
                            text: "answer",
                        },
                    ],
                },
            ],
            tools: [
                {
                    name: "search",
                    description: "search docs",
                    input_schema: {
                        type: "object",
                        properties: {
                            q: {
                                type: "string",
                            },
                        },
                    },
                },
            ],
        })
    })

    test("normalizes OpenAI request with provider default model and optional fallback fields", () => {
        const normalized = normalizeLlmProviderRequest(LLM_ACL_PROVIDER.OPENAI, {
            model: " ",
            temperature: Number.NaN,
            maxTokens: -1,
            messages: [
                {
                    role: "assistant",
                    content: " keep name ",
                    name: "worker",
                    toolCallId: "tool-123",
                },
            ],
        })

        expect(normalized).toEqual({
            model: "gpt-4o-mini",
            temperature: undefined,
            max_tokens: undefined,
            tools: undefined,
            response_format: undefined,
            messages: [
                {
                    role: "assistant",
                    content: "keep name",
                    name: "worker",
                    toolCallId: "tool-123",
                },
            ],
        })
    })

    test("normalizes Anthropic request with explicit max tokens and no system message", () => {
        const normalized = normalizeLlmProviderRequest(
            LLM_ACL_PROVIDER.ANTHROPIC,
            {
                model: " ",
                maxTokens: 512,
                temperature: 0.7,
                messages: [
                    {
                        role: "user",
                        content: " ping ",
                    },
                ],
            },
            {
                fallbackModelByProvider: {
                    ANTHROPIC: "   ",
                },
                anthropicDefaultMaxTokens: 0,
            },
        )

        expect(normalized).toEqual({
            model: "claude-3-5-haiku-latest",
            system: undefined,
            max_tokens: 512,
            temperature: 0.7,
            tools: undefined,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "ping",
                        },
                    ],
                },
            ],
        })
    })

    test("applies Anthropic default max tokens when explicit values are absent", () => {
        const normalized = normalizeLlmProviderRequest(LLM_ACL_PROVIDER.ANTHROPIC, {
            model: "anthropic-model",
            maxTokens: undefined,
            temperature: undefined,
            messages: [
                {
                    role: "user",
                    content: "default max tokens",
                },
            ],
        })

        expect(normalized).toEqual({
            model: "anthropic-model",
            system: undefined,
            max_tokens: 1024,
            temperature: undefined,
            tools: undefined,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "default max tokens",
                        },
                    ],
                },
            ],
        })
    })

    test("normalizes OpenAI response with usage and explicit cost field", () => {
        const normalized = normalizeLlmProviderResponse(LLM_ACL_PROVIDER.OPENAI, {
            choices: [
                {
                    message: {
                        content: "Done",
                        tool_calls: [
                            {
                                id: "call-1",
                                function: {
                                    name: "calc",
                                    arguments: "{\"a\":1}",
                                },
                            },
                        ],
                    },
                    finish_reason: "tool_calls",
                },
            ],
            usage: {
                prompt_tokens: 120,
                completion_tokens: 30,
                total_tokens: 150,
                cost_usd: 0.12,
            },
        })

        expect(normalized).toEqual({
            response: {
                content: "Done",
                finishReason: CHAT_FINISH_REASON.TOOL_CALLS,
                toolCalls: [
                    {
                        id: "call-1",
                        name: "calc",
                        arguments: "{\"a\":1}",
                    },
                ],
                usage: {
                    input: 120,
                    output: 30,
                    total: 150,
                },
            },
            estimatedCostUsd: 0.12,
        })
    })

    test("normalizes Anthropic response and estimates cost when explicit cost is absent", () => {
        const normalized = normalizeLlmProviderResponse(
            LLM_ACL_PROVIDER.ANTHROPIC,
            {
                content: [
                    {
                        type: "text",
                        text: "Line 1",
                    },
                    {
                        type: "text",
                        text: "Line 2",
                    },
                    {
                        type: "tool_use",
                        id: "tool-1",
                        name: "search",
                        input: {
                            q: "query",
                        },
                    },
                ],
                usage: {
                    input_tokens: 400,
                    output_tokens: 100,
                },
                stop_reason: "stop",
            },
            {
                pricingByProvider: {
                    ANTHROPIC: {
                        inputPer1kUsd: 0.003,
                        outputPer1kUsd: 0.015,
                    },
                },
            },
        )

        expect(normalized.response).toEqual({
            content: "Line 1\nLine 2",
            finishReason: CHAT_FINISH_REASON.STOP,
            toolCalls: [
                {
                    id: "tool-1",
                    name: "search",
                    arguments: "{\"q\":\"query\"}",
                },
            ],
            usage: {
                input: 400,
                output: 100,
                total: 500,
            },
        })
        expect(normalized.estimatedCostUsd).toBe(0.0027)
    })

    test("uses explicit root cost field when available", () => {
        const normalized = normalizeLlmProviderResponse(LLM_ACL_PROVIDER.OPENAI, {
            costUsd: 0.21,
            usage: {
                prompt_tokens: 20,
                completion_tokens: 10,
            },
        })

        expect(normalized).toEqual({
            response: {
                content: "",
                finishReason: undefined,
                usage: {
                    input: 20,
                    output: 10,
                    total: 30,
                },
            },
            estimatedCostUsd: 0.21,
        })
    })

    test("applies response fallback behavior for missing blocks and malformed usage", () => {
        const openAiFallback = normalizeLlmProviderResponse(LLM_ACL_PROVIDER.OPENAI, {
            output_text: "fallback output",
            usage: {
                prompt_tokens: "7",
                completion_tokens: "3",
                total_tokens: "10",
                costUsd: "0.05",
            },
        })

        const anthropicFallback = normalizeLlmProviderResponse(LLM_ACL_PROVIDER.ANTHROPIC, {
            completion: "fallback completion",
            content: [
                {
                    type: "tool_use",
                    id: "tool-only",
                    name: "only_tool",
                    input: "not-object",
                },
            ],
            usage: {
                input_tokens: "bad",
                output_tokens: null,
                total_tokens: undefined,
            },
        })

        expect(openAiFallback).toEqual({
            response: {
                content: "fallback output",
                finishReason: undefined,
                usage: {
                    input: 7,
                    output: 3,
                    total: 10,
                },
            },
            estimatedCostUsd: 0.05,
        })

        expect(anthropicFallback).toEqual({
            response: {
                content: "fallback completion",
                finishReason: undefined,
                toolCalls: [
                    {
                        id: "tool-only",
                        name: "only_tool",
                        arguments: "{}",
                    },
                ],
                usage: {
                    input: 0,
                    output: 0,
                    total: 0,
                },
            },
            estimatedCostUsd: 0,
        })
    })

    test("keeps unified domain response shape for two providers", () => {
        const openAi = normalizeLlmProviderResponse(LLM_ACL_PROVIDER.OPENAI, {
            choices: [
                {
                    message: {
                        content: "openai",
                    },
                },
            ],
            usage: {
                prompt_tokens: 1,
                completion_tokens: 1,
            },
        })

        const anthropic = normalizeLlmProviderResponse(LLM_ACL_PROVIDER.ANTHROPIC, {
            content: [
                {
                    type: "text",
                    text: "anthropic",
                },
            ],
            usage: {
                input_tokens: 2,
                output_tokens: 2,
            },
        })

        expect(Object.keys(openAi.response).sort()).toEqual([
            "content",
            "finishReason",
            "usage",
        ])
        expect(Object.keys(anthropic.response).sort()).toEqual([
            "content",
            "finishReason",
            "usage",
        ])
    })

    test("exposes class-based ACL wrappers for request and response conversions", () => {
        const openAiRequestAcl = new OpenAiRequestAcl({
            fallbackModelByProvider: {
                OPENAI: "gpt-4o-mini",
            },
        })
        const anthropicRequestAcl = new AnthropicRequestAcl({
            fallbackModelByProvider: {
                ANTHROPIC: "claude-3-5-sonnet",
            },
        })
        const openAiResponseAcl = new OpenAiResponseAcl()
        const anthropicResponseAcl = new AnthropicResponseAcl()

        const openAiRequest = openAiRequestAcl.toDomain({
            model: "",
            messages: [
                {
                    role: "user",
                    content: "hello",
                },
            ],
        })
        const anthropicRequest = anthropicRequestAcl.toDomain({
            model: "",
            messages: [
                {
                    role: "user",
                    content: "hello",
                },
            ],
        })
        const openAiResponse = openAiResponseAcl.toDomain({
            output_text: "openai",
            usage: {
                prompt_tokens: 1,
                completion_tokens: 1,
            },
        })
        const anthropicResponse = anthropicResponseAcl.toDomain({
            completion: "anthropic",
            usage: {
                input_tokens: 1,
                output_tokens: 1,
            },
        })

        expect(openAiRequest.model).toBe("gpt-4o-mini")
        expect(anthropicRequest.model).toBe("claude-3-5-sonnet")
        expect(openAiResponse.response.content).toBe("openai")
        expect(anthropicResponse.response.content).toBe("anthropic")
    })
})
