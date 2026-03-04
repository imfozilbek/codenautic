import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "../../../utils/render"
import { server } from "../../../mocks/server"
import {
    useCustomRules,
    type IUseCustomRulesResult,
} from "@/lib/hooks/queries/use-custom-rules"
import {
    CUSTOM_RULE_SCOPE,
    CUSTOM_RULE_SEVERITY,
    CUSTOM_RULE_STATUS,
    CUSTOM_RULE_TYPE,
    type ICreateCustomRuleRequest,
    type ICustomRule,
    type IUpdateCustomRuleRequest,
} from "@/lib/api/endpoints/custom-rules.endpoint"

const BASE_RULE: ICustomRule = {
    id: "rule-1",
    title: "Current rule",
    rule: "if (x) { }",
    type: CUSTOM_RULE_TYPE.regex,
    scope: CUSTOM_RULE_SCOPE.file,
    severity: CUSTOM_RULE_SEVERITY.low,
    status: CUSTOM_RULE_STATUS.active,
    examples: [
        {
            snippet: "if (value) { }",
            isCorrect: true,
        },
    ],
}

function CustomRulesProbe(): ReactElement {
    const hook = useCustomRules({
        scope: CUSTOM_RULE_SCOPE.file,
        status: CUSTOM_RULE_STATUS.active,
    })
    const [createStatus, setCreateStatus] = useState<string>("idle")
    const [updateStatus, setUpdateStatus] = useState<string>("idle")
    const [deleteStatus, setDeleteStatus] = useState<string>("idle")

    return (
        <div>
            <CustomRulesState {...hook} />
            <p data-testid="create-status">{createStatus}</p>
            <p data-testid="update-status">{updateStatus}</p>
            <p data-testid="delete-status">{deleteStatus}</p>
            <button
                data-testid="create-rule"
                disabled={hook.createRule.isPending}
                onClick={(): void => {
                    void createCustomRule(hook, setCreateStatus)
                }}
                type="button"
            >
                Create rule
            </button>
            <button
                data-testid="update-rule"
                disabled={hook.updateRule.isPending}
                onClick={(): void => {
                    void updateCustomRule(hook, setUpdateStatus)
                }}
                type="button"
            >
                Update rule
            </button>
            <button
                data-testid="delete-rule"
                disabled={hook.deleteRule.isPending}
                onClick={(): void => {
                    void deleteCustomRule(hook, setDeleteStatus)
                }}
                type="button"
            >
                Delete rule
            </button>
        </div>
    )
}

function CustomRulesState(hook: IUseCustomRulesResult): ReactElement {
    if (hook.customRulesQuery.isPending) {
        return <p data-testid="custom-rules-state">pending</p>
    }

    if (hook.customRulesQuery.error !== null) {
        return <p data-testid="custom-rules-state">error</p>
    }

    return (
        <div>
            <p data-testid="custom-rules-count">
                {hook.customRulesQuery.data?.rules.length ?? 0}
            </p>
            <p data-testid="custom-rules-titles">
                {hook.customRulesQuery.data?.rules.map((item): string => item.title).join("|") ??
                    "empty"}
            </p>
        </div>
    )
}

function buildCreateRequest(): ICreateCustomRuleRequest {
    return {
        title: "Draft optimistic rule",
        rule: "console.log(value)",
        type: CUSTOM_RULE_TYPE.ast,
        scope: CUSTOM_RULE_SCOPE.ccr,
        severity: CUSTOM_RULE_SEVERITY.medium,
        status: CUSTOM_RULE_STATUS.pending,
        examples: [
            {
                snippet: "console.log(value)",
                isCorrect: true,
            },
        ],
    }
}

function buildUpdateRequest(): IUpdateCustomRuleRequest {
    return {
        id: BASE_RULE.id,
        title: "Remote updated rule",
    }
}

async function createCustomRule(
    hook: IUseCustomRulesResult,
    setCreateStatus: (next: string) => void,
): Promise<void> {
    setCreateStatus("loading")
    const result = await hook.createRule.mutateAsync(buildCreateRequest())
    setCreateStatus(`created:${result.id}`)
}

async function updateCustomRule(
    hook: IUseCustomRulesResult,
    setUpdateStatus: (next: string) => void,
): Promise<void> {
    setUpdateStatus("loading")
    const result = await hook.updateRule.mutateAsync(buildUpdateRequest())
    setUpdateStatus(`updated:${result.id}`)
}

async function deleteCustomRule(
    hook: IUseCustomRulesResult,
    setDeleteStatus: (next: string) => void,
): Promise<void> {
    setDeleteStatus("loading")
    const result = await hook.deleteRule.mutateAsync({
        id: BASE_RULE.id,
    })
    setDeleteStatus(`deleted:${result.id}`)
}

describe("useCustomRules", (): void => {
    it("загружает список custom rules", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:3000/api/v1/rules", () => {
                return HttpResponse.json({
                    rules: [BASE_RULE],
                    total: 1,
                })
            }),
        )

        renderWithProviders(<CustomRulesProbe />)
        expect(screen.getByTestId("custom-rules-state").textContent).toBe("pending")

        const titles = await screen.findByTestId("custom-rules-titles")
        expect(titles.textContent).toBe("Current rule")
    })

    it("создаёт правило с оптимистичным обновлением", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:3000/api/v1/rules", () => {
                return HttpResponse.json({
                    rules: [BASE_RULE],
                    total: 1,
                })
            }),
            http.post("http://localhost:3000/api/v1/rules", async () => {
                return HttpResponse.json(
                    {
                        ...BASE_RULE,
                        id: "server-rule",
                        title: "Remote created rule",
                        scope: CUSTOM_RULE_SCOPE.ccr,
                    },
                )
            }),
        )

        renderWithProviders(<CustomRulesProbe />)
        expect(await screen.findByTestId("custom-rules-titles")).toHaveTextContent(
            "Current rule",
        )
        await userEvent.click(screen.getByTestId("create-rule"))

        await waitFor((): void => {
            expect(screen.getByTestId("create-status").textContent).toBe("created:server-rule")
        }, { timeout: 250 })
    })

    it("обновляет правило с оптимистичным обновлением", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:3000/api/v1/rules", () => {
                return HttpResponse.json({
                    rules: [BASE_RULE],
                    total: 1,
                })
            }),
            http.put("http://localhost:3000/api/v1/rules/rule-1", async () => {
                return HttpResponse.json(
                    {
                        ...BASE_RULE,
                        title: "Remote updated rule",
                    },
                )
            }),
        )

        renderWithProviders(<CustomRulesProbe />)
        expect(await screen.findByTestId("custom-rules-titles")).toHaveTextContent(
            "Current rule",
        )
        await userEvent.click(screen.getByTestId("update-rule"))

        await waitFor((): void => {
            expect(screen.getByTestId("update-status").textContent).toBe("updated:rule-1")
        }, { timeout: 250 })
    })

    it("удаляет правило с оптимистичным обновлением", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:3000/api/v1/rules", () => {
                return HttpResponse.json({
                    rules: [BASE_RULE],
                    total: 1,
                })
            }),
            http.delete("http://localhost:3000/api/v1/rules/rule-1", async () => {
                return HttpResponse.json(
                    {
                        id: "rule-1",
                        removed: true,
                    },
                )
            }),
        )

        renderWithProviders(<CustomRulesProbe />)
        expect(await screen.findByTestId("custom-rules-count")).toHaveTextContent("1")
        await userEvent.click(screen.getByTestId("delete-rule"))
        await waitFor((): void => {
            expect(screen.getByTestId("delete-status").textContent).toBe("deleted:rule-1")
        }, { timeout: 250 })
    })
})
