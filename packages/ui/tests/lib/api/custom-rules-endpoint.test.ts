import { describe, expect, it, vi } from "vitest"

import type { IHttpClient } from "@/lib/api"
import {
    CUSTOM_RULE_SCOPE,
    CUSTOM_RULE_SEVERITY,
    CUSTOM_RULE_STATUS,
    CUSTOM_RULE_TYPE,
    CustomRulesApi,
    type ICustomRule,
    type ICreateCustomRuleRequest,
    type ICustomRulesListResponse,
    type IDeleteCustomRuleResponse,
    type IDeleteCustomRuleRequest,
    type IUpdateCustomRuleRequest,
} from "@/lib/api/endpoints/custom-rules.endpoint"

function createHttpClientMock(): {
    readonly httpClient: IHttpClient
    readonly requestMock: ReturnType<typeof vi.fn>
} {
    const requestMock = vi.fn()
    return {
        httpClient: {
            request: requestMock,
        },
        requestMock,
    }
}

describe("CustomRulesApi", (): void => {
    const mockRule: ICustomRule = {
        id: "rule-1",
        title: "No nested ternary",
        rule: "?:",
        type: CUSTOM_RULE_TYPE.regex,
        scope: CUSTOM_RULE_SCOPE.file,
        severity: CUSTOM_RULE_SEVERITY.low,
        status: CUSTOM_RULE_STATUS.active,
        examples: [
            {
                snippet: "const value = condition ? a : b",
                isCorrect: true,
            },
        ],
    }

    it("получает список custom rules с query", async (): Promise<void> => {
        const response: ICustomRulesListResponse = {
            rules: [mockRule],
            total: 1,
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CustomRulesApi(httpClient)
        const result = await api.listCustomRules({
            scope: CUSTOM_RULE_SCOPE.file,
            status: CUSTOM_RULE_STATUS.active,
        })

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/rules",
            query: {
                scope: CUSTOM_RULE_SCOPE.file,
                status: CUSTOM_RULE_STATUS.active,
            },
            credentials: "include",
        })
    })

    it("получает custom rule по id", async (): Promise<void> => {
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(mockRule)

        const api = new CustomRulesApi(httpClient)
        const result = await api.getCustomRule("rule-1")

        expect(result).toEqual(mockRule)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/rules/rule-1",
            credentials: "include",
        })
    })

    it("создаёт правило с корректным payload", async (): Promise<void> => {
        const response: ICustomRule = {
            ...mockRule,
            id: "rule-new",
        }
        const payload: ICreateCustomRuleRequest = {
            title: "Use strict mode",
            rule: "'use strict';",
            type: CUSTOM_RULE_TYPE.prompt,
            scope: CUSTOM_RULE_SCOPE.ccr,
            severity: CUSTOM_RULE_SEVERITY.critical,
            status: CUSTOM_RULE_STATUS.pending,
            examples: [
                {
                    snippet: '"use strict"',
                    isCorrect: false,
                },
            ],
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CustomRulesApi(httpClient)
        const result = await api.createCustomRule(payload)

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/rules",
            body: payload,
            credentials: "include",
        })
    })

    it("обновляет правило по id с trim id и без передачи id в body", async (): Promise<void> => {
        const response: ICustomRule = {
            ...mockRule,
            title: "No ternary",
        }
        const payload: IUpdateCustomRuleRequest = {
            id: "  rule-1  ",
            title: "No ternary",
            status: CUSTOM_RULE_STATUS.active,
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CustomRulesApi(httpClient)
        const result = await api.updateCustomRule(payload)

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "PUT",
            path: "/api/v1/rules/rule-1",
            body: {
                title: "No ternary",
                status: CUSTOM_RULE_STATUS.active,
            },
            credentials: "include",
        })
    })

    it("удаляет правило по id с trim id", async (): Promise<void> => {
        const response: IDeleteCustomRuleResponse = {
            id: "rule-1",
            removed: true,
        }
        const payload: IDeleteCustomRuleRequest = {
            id: "  rule-1  ",
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CustomRulesApi(httpClient)
        const result = await api.deleteCustomRule(payload)

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "DELETE",
            path: "/api/v1/rules/rule-1",
            credentials: "include",
        })
    })

    describe("listCustomRules default query", (): void => {
        it("when called without query, then passes empty object", async (): Promise<void> => {
            const response: ICustomRulesListResponse = {
                rules: [],
                total: 0,
            }
            const { httpClient, requestMock } = createHttpClientMock()
            requestMock.mockResolvedValueOnce(response)

            const api = new CustomRulesApi(httpClient)
            const result = await api.listCustomRules()

            expect(result).toEqual(response)
            expect(requestMock).toHaveBeenCalledWith({
                method: "GET",
                path: "/api/v1/rules",
                query: {},
                credentials: "include",
            })
        })
    })

    describe("getCustomRule validation", (): void => {
        it("when ruleId is empty string, then throws error", async (): Promise<void> => {
            const { httpClient } = createHttpClientMock()
            const api = new CustomRulesApi(httpClient)

            await expect(api.getCustomRule("")).rejects.toThrowError("ruleId не должен быть пустым")
        })

        it("when ruleId is whitespace only, then throws error", async (): Promise<void> => {
            const { httpClient } = createHttpClientMock()
            const api = new CustomRulesApi(httpClient)

            await expect(api.getCustomRule("   ")).rejects.toThrowError(
                "ruleId не должен быть пустым",
            )
        })

        it("when ruleId has special characters, then encodes them in path", async (): Promise<void> => {
            const { httpClient, requestMock } = createHttpClientMock()
            requestMock.mockResolvedValueOnce(mockRule)

            const api = new CustomRulesApi(httpClient)
            await api.getCustomRule("rule/with spaces")

            expect(requestMock).toHaveBeenCalledWith({
                method: "GET",
                path: "/api/v1/rules/rule%2Fwith%20spaces",
                credentials: "include",
            })
        })
    })

    describe("updateCustomRule validation", (): void => {
        it("when id is empty string, then throws error", async (): Promise<void> => {
            const { httpClient } = createHttpClientMock()
            const api = new CustomRulesApi(httpClient)

            const payload: IUpdateCustomRuleRequest = {
                id: "",
                title: "Updated",
            }

            await expect(api.updateCustomRule(payload)).rejects.toThrowError(
                "ruleId не должен быть пустым",
            )
        })

        it("when id is whitespace only, then throws error", async (): Promise<void> => {
            const { httpClient } = createHttpClientMock()
            const api = new CustomRulesApi(httpClient)

            const payload: IUpdateCustomRuleRequest = {
                id: "   ",
                title: "Updated",
            }

            await expect(api.updateCustomRule(payload)).rejects.toThrowError(
                "ruleId не должен быть пустым",
            )
        })
    })

    describe("deleteCustomRule validation", (): void => {
        it("when id is empty string, then throws error", async (): Promise<void> => {
            const { httpClient } = createHttpClientMock()
            const api = new CustomRulesApi(httpClient)

            await expect(api.deleteCustomRule({ id: "" })).rejects.toThrowError(
                "ruleId не должен быть пустым",
            )
        })

        it("when id is whitespace only, then throws error", async (): Promise<void> => {
            const { httpClient } = createHttpClientMock()
            const api = new CustomRulesApi(httpClient)

            await expect(api.deleteCustomRule({ id: "   " })).rejects.toThrowError(
                "ruleId не должен быть пустым",
            )
        })
    })
})
