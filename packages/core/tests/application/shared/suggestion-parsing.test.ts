import {describe, expect, test} from "bun:test"

import type {IToolCallDTO} from "../../../src/application/dto/llm/message.dto"
import {
    extractJsonArray,
    parseFromContent,
    parseFromToolCalls,
    parseSuggestions,
} from "../../../src/application/shared/suggestion-parsing"
import {SUGGESTION_TOOL} from "../../../src/application/shared/suggestion-tool"

describe("suggestion parsing", () => {
    test("extractJsonArray returns array payloads as-is", () => {
        const payload = [{message: "one"}, {message: "two"}]

        expect(extractJsonArray(payload)).toEqual(payload)
    })

    test("extractJsonArray returns nested suggestions from object payload", () => {
        const payload = {suggestions: [{id: "one"}]}

        expect(extractJsonArray(payload)).toEqual([{id: "one"}])
    })

    test("extractJsonArray returns empty array when payload has no suggestions", () => {
        const payload = {items: [{id: "one"}]}

        expect(extractJsonArray(payload)).toEqual([])
    })

    test("parseFromContent returns parsed array payload", () => {
        const content = JSON.stringify([{message: "parsed"}])

        const parsed = parseFromContent(content)

        expect(parsed).toEqual([{message: "parsed"}])
    })

    test("parseFromContent supports suggestion object payloads", () => {
        const content = JSON.stringify({suggestions: [{message: "nested"}]})

        const parsed = parseFromContent(content)

        expect(parsed).toEqual({suggestions: [{message: "nested"}]})
        expect(parsed === null ? [] : extractJsonArray(parsed)).toEqual([{message: "nested"}])
    })

    test("parseFromContent returns null for invalid JSON", () => {
        const parsed = parseFromContent("{invalid")

        expect(parsed).toBeNull()
    })

    test("parseFromContent returns null for scalar JSON values", () => {
        expect(parseFromContent("true")).toBeNull()
        expect(parseFromContent("42")).toBeNull()
    })

    test("parseFromToolCalls parses JSON arguments", () => {
        const toolCalls: readonly IToolCallDTO[] = [
            {id: "1", name: SUGGESTION_TOOL, arguments: JSON.stringify([{message: "one"}])},
            {id: "2", name: SUGGESTION_TOOL, arguments: JSON.stringify({suggestions: [{message: "two"}]})},
        ]

        const parsed = parseFromToolCalls(toolCalls)

        expect(parsed).toEqual([[{message: "one"}], {suggestions: [{message: "two"}]}])
    })

    test("parseFromToolCalls respects tool name filtering", () => {
        const toolCalls: readonly IToolCallDTO[] = [
            {id: "1", name: SUGGESTION_TOOL, arguments: JSON.stringify([{message: "one"}])},
            {id: "2", name: "other", arguments: JSON.stringify([{message: "two"}])},
        ]

        const parsed = parseFromToolCalls(toolCalls, [SUGGESTION_TOOL])

        expect(parsed).toEqual([[{message: "one"}]])
    })

    test("parseFromToolCalls returns empty for empty list", () => {
        const parsed = parseFromToolCalls([])

        expect(parsed).toEqual([])
    })

    test("parseFromToolCalls ignores invalid JSON payloads", () => {
        const toolCalls: readonly IToolCallDTO[] = [
            {id: "1", name: SUGGESTION_TOOL, arguments: "null"},
            {id: "2", name: SUGGESTION_TOOL, arguments: "true"},
        ]

        const parsed = parseFromToolCalls(toolCalls, [SUGGESTION_TOOL, " "])

        expect(parsed).toEqual([])
    })

    test("parseSuggestions prefers tool call suggestions over content", () => {
        const toolCalls: readonly IToolCallDTO[] = [
            {id: "1", name: SUGGESTION_TOOL, arguments: JSON.stringify({suggestions: [{message: "tool"}]})},
        ]

        const parsed = parseSuggestions({
            content: JSON.stringify({suggestions: [{message: "content"}]}),
            toolCalls,
        })

        expect(parsed).toEqual([{message: "tool"}])
    })

    test("parseSuggestions falls back to content when tool calls are empty", () => {
        const parsed = parseSuggestions({
            content: JSON.stringify({suggestions: [{message: "content"}]}),
            toolCalls: [],
        })

        expect(parsed).toEqual([{message: "content"}])
    })

    test("parseSuggestions returns empty when content is missing", () => {
        const parsed = parseSuggestions({toolCalls: []})

        expect(parsed).toEqual([])
    })

    test("parseSuggestions returns empty when content is invalid", () => {
        const parsed = parseSuggestions({
            content: "{invalid",
            toolCalls: [],
        })

        expect(parsed).toEqual([])
    })
})
