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

describe("useDryRun", (): void => {
    it("запускает dry-run и возвращает результат", async (): Promise<void> => {
        server.use(
            http.post("http://localhost:3000/api/v1/repositories/repo-1/dry-run", () => {
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
})
