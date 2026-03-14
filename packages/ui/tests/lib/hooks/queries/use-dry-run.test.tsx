import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { useDryRun } from "@/lib/hooks/queries/use-dry-run"
import { server } from "../../../mocks/server"
import { renderWithProviders } from "../../../utils/render"

function DryRunProbe(): ReactElement {
    const hook = useDryRun()
    const [status, setStatus] = useState<string>("idle")

    return (
        <div>
            <p data-testid="dry-run-status">{status}</p>
            <button
                data-testid="trigger-dry-run"
                disabled={hook.runDryRun.isPending}
                onClick={(): void => {
                    void triggerDryRun(hook, setStatus)
                }}
                type="button"
            >
                Trigger dry-run
            </button>
        </div>
    )
}

async function triggerDryRun(
    hook: ReturnType<typeof useDryRun>,
    setStatus: (next: string) => void,
): Promise<void> {
    setStatus("loading")
    const response = await hook.runDryRun.mutateAsync({
        repositoryId: "repo-1",
        reviewMode: "AUTO",
        ignorePatterns: ["/dist"],
    })
    setStatus(`${response.result.mode}:${response.result.reviewedFiles}`)
}

function DryRunErrorProbe(): ReactElement {
    const hook = useDryRun()
    const [status, setStatus] = useState<string>("idle")

    return (
        <div>
            <p data-testid="dry-run-status">{status}</p>
            <button
                data-testid="trigger-dry-run"
                disabled={hook.runDryRun.isPending}
                onClick={(): void => {
                    void hook.runDryRun
                        .mutateAsync({
                            repositoryId: "repo-fail",
                            reviewMode: "MANUAL",
                            ignorePatterns: [],
                        })
                        .then((response): void => {
                            setStatus(`${response.result.mode}:${response.result.reviewedFiles}`)
                        })
                        .catch((): void => {
                            setStatus("error")
                        })
                }}
                type="button"
            >
                Trigger dry-run
            </button>
        </div>
    )
}

function DryRunIssuesProbe(): ReactElement {
    const hook = useDryRun()
    const [issueCount, setIssueCount] = useState<string>("idle")

    return (
        <div>
            <p data-testid="dry-run-issues">{issueCount}</p>
            <button
                data-testid="trigger-dry-run"
                disabled={hook.runDryRun.isPending}
                onClick={(): void => {
                    void hook.runDryRun
                        .mutateAsync({
                            repositoryId: "repo-1",
                            reviewMode: "AUTO",
                            ignorePatterns: ["**/dist/**"],
                        })
                        .then((response): void => {
                            setIssueCount(`issues:${response.result.issues.length}`)
                        })
                        .catch((): void => {
                            setIssueCount("error")
                        })
                }}
                type="button"
            >
                Trigger dry-run
            </button>
        </div>
    )
}

describe("useDryRun", (): void => {
    it("запускает dry-run и возвращает результат", async (): Promise<void> => {
        server.use(
            http.post("http://localhost:7120/api/v1/repositories/repo-1/dry-run", () => {
                return HttpResponse.json({
                    result: {
                        mode: "AUTO",
                        reviewedFiles: 7,
                        suggestions: 2,
                        issues: [
                            {
                                filePath: "src/index.ts",
                                severity: "medium",
                                title: "Potential timeout gap",
                            },
                        ],
                    },
                })
            }),
        )

        renderWithProviders(<DryRunProbe />)
        await userEvent.click(screen.getByTestId("trigger-dry-run"))

        await waitFor((): void => {
            expect(screen.getByTestId("dry-run-status")).toHaveTextContent("AUTO:7")
        })
    })

    it("обрабатывает ошибку при dry-run запросе", async (): Promise<void> => {
        server.use(
            http.post("http://localhost:7120/api/v1/repositories/repo-fail/dry-run", () => {
                return HttpResponse.json({ error: "Repository not found" }, { status: 404 })
            }),
        )

        renderWithProviders(<DryRunErrorProbe />)
        await userEvent.click(screen.getByTestId("trigger-dry-run"))

        await waitFor((): void => {
            expect(screen.getByTestId("dry-run-status")).toHaveTextContent("error")
        })
    })

    it("возвращает количество найденных issues", async (): Promise<void> => {
        server.use(
            http.post("http://localhost:7120/api/v1/repositories/repo-1/dry-run", () => {
                return HttpResponse.json({
                    result: {
                        mode: "AUTO",
                        reviewedFiles: 12,
                        suggestions: 5,
                        issues: [
                            {
                                filePath: "src/auth.ts",
                                severity: "high",
                                title: "Missing null check",
                            },
                            {
                                filePath: "src/config.ts",
                                severity: "low",
                                title: "Unused import",
                            },
                            {
                                filePath: "src/handler.ts",
                                severity: "medium",
                                title: "Uncaught promise",
                            },
                        ],
                    },
                })
            }),
        )

        renderWithProviders(<DryRunIssuesProbe />)
        await userEvent.click(screen.getByTestId("trigger-dry-run"))

        await waitFor((): void => {
            expect(screen.getByTestId("dry-run-issues")).toHaveTextContent("issues:3")
        })
    })

    it("возвращает результат с нулевыми suggestions и issues", async (): Promise<void> => {
        server.use(
            http.post("http://localhost:7120/api/v1/repositories/repo-1/dry-run", () => {
                return HttpResponse.json({
                    result: {
                        mode: "AUTO",
                        reviewedFiles: 3,
                        suggestions: 0,
                        issues: [],
                    },
                })
            }),
        )

        renderWithProviders(<DryRunProbe />)
        await userEvent.click(screen.getByTestId("trigger-dry-run"))

        await waitFor((): void => {
            expect(screen.getByTestId("dry-run-status")).toHaveTextContent("AUTO:3")
        })
    })

    it("начинает с idle состояния до первого вызова", (): void => {
        renderWithProviders(<DryRunProbe />)

        expect(screen.getByTestId("dry-run-status")).toHaveTextContent("idle")
    })
})
