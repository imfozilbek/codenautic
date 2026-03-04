import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { useCCRSummary } from "@/lib/hooks/queries/use-ccr-summary"
import { server } from "../../../mocks/server"
import { renderWithProviders } from "../../../utils/render"

function CcrSummaryProbe(): ReactElement {
    const hook = useCCRSummary({
        repositoryId: "repo-1",
        enabled: true,
    })
    const [status, setStatus] = useState<string>("idle")

    return (
        <div>
            <p data-testid="ccr-summary-status">{status}</p>
            <button
                data-testid="generate-ccr-summary"
                disabled={hook.generateSummary.isPending}
                onClick={(): void => {
                    void triggerCcrSummaryGeneration(hook, setStatus)
                }}
                type="button"
            >
                Generate summary
            </button>
        </div>
    )
}

async function triggerCcrSummaryGeneration(
    hook: ReturnType<typeof useCCRSummary>,
    setStatus: (next: string) => void,
): Promise<void> {
    setStatus("loading")
    const response = await hook.generateSummary.mutateAsync({
        repositoryId: "repo-1",
        reviewMode: "AUTO",
        detailLevel: "STANDARD",
        includeRiskOverview: true,
        includeTimeline: true,
        maxSuggestions: 8,
        promptOverride: "Use short actionable blocks.",
    })
    setStatus(`${response.result.mode}:${response.result.highlights.length}`)
}

describe("useCCRSummary", (): void => {
    it("генерирует ccr summary и возвращает результат", async (): Promise<void> => {
        server.use(
            http.post("http://localhost:3000/api/v1/repositories/repo-1/ccr-summary/generate", () => {
                return HttpResponse.json({
                    result: {
                        mode: "AUTO",
                        generatedAt: "2026-03-05T07:00:00.000Z",
                        summary: "Queue pressure increased in review-worker stage.",
                        highlights: ["Queue saturation", "Retry spikes"],
                    },
                })
            }),
        )

        renderWithProviders(<CcrSummaryProbe />)
        await userEvent.click(screen.getByTestId("generate-ccr-summary"))

        await waitFor((): void => {
            expect(screen.getByTestId("ccr-summary-status")).toHaveTextContent("AUTO:2")
        })
    })
})
