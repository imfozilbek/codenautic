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

function CcrSummaryDisabledProbe(): ReactElement {
    const hook = useCCRSummary({
        repositoryId: "repo-1",
        enabled: false,
    })

    return (
        <div>
            <p data-testid="summary-pending">{String(hook.summaryQuery.isPending)}</p>
            <p data-testid="summary-fetched">{String(hook.summaryQuery.isFetched)}</p>
        </div>
    )
}

function CcrSummaryEmptyRepoProbe(): ReactElement {
    const hook = useCCRSummary({
        repositoryId: "   ",
        enabled: true,
    })

    return (
        <div>
            <p data-testid="summary-pending">{String(hook.summaryQuery.isPending)}</p>
            <p data-testid="summary-fetched">{String(hook.summaryQuery.isFetched)}</p>
        </div>
    )
}

function CcrSummaryErrorProbe(): ReactElement {
    const hook = useCCRSummary({
        repositoryId: "repo-1",
        enabled: true,
    })
    const [status, setStatus] = useState<string>("idle")

    return (
        <div>
            <p data-testid="ccr-summary-status">{status}</p>
            <p data-testid="mutation-error">{hook.generateSummary.error?.message ?? "none"}</p>
            <button
                data-testid="generate-ccr-summary"
                disabled={hook.generateSummary.isPending}
                onClick={(): void => {
                    void hook.generateSummary
                        .mutateAsync({
                            repositoryId: "repo-1",
                            reviewMode: "AUTO",
                            detailLevel: "STANDARD",
                            includeRiskOverview: true,
                            includeTimeline: true,
                            maxSuggestions: 8,
                            promptOverride: "",
                        })
                        .then((response): void => {
                            setStatus(
                                `${response.result.mode}:${response.result.highlights.length}`,
                            )
                        })
                        .catch((): void => {
                            setStatus("error")
                        })
                }}
                type="button"
            >
                Generate summary
            </button>
        </div>
    )
}

describe("useCCRSummary", (): void => {
    it("генерирует ccr summary и возвращает результат", async (): Promise<void> => {
        server.use(
            http.post(
                "http://localhost:7120/api/v1/repositories/repo-1/ccr-summary/generate",
                () => {
                    return HttpResponse.json({
                        result: {
                            mode: "AUTO",
                            generatedAt: "2026-03-05T07:00:00.000Z",
                            summary: "Queue pressure increased in review-worker stage.",
                            highlights: ["Queue saturation", "Retry spikes"],
                        },
                    })
                },
            ),
        )

        renderWithProviders(<CcrSummaryProbe />)
        await userEvent.click(screen.getByTestId("generate-ccr-summary"))

        await waitFor((): void => {
            expect(screen.getByTestId("ccr-summary-status")).toHaveTextContent("AUTO:2")
        })
    })

    it("не загружает данные когда enabled=false", async (): Promise<void> => {
        renderWithProviders(<CcrSummaryDisabledProbe />)

        await new Promise((resolve): void => {
            setTimeout(resolve, 50)
        })
        expect(screen.getByTestId("summary-fetched")).toHaveTextContent("false")
    })

    it("не загружает данные для пустого repositoryId", async (): Promise<void> => {
        renderWithProviders(<CcrSummaryEmptyRepoProbe />)

        await new Promise((resolve): void => {
            setTimeout(resolve, 50)
        })
        expect(screen.getByTestId("summary-fetched")).toHaveTextContent("false")
    })

    it("обрабатывает ошибку при генерации summary", async (): Promise<void> => {
        server.use(
            http.post(
                "http://localhost:7120/api/v1/repositories/repo-1/ccr-summary/generate",
                () => {
                    return HttpResponse.json({ error: "LLM provider unavailable" }, { status: 503 })
                },
            ),
        )

        renderWithProviders(<CcrSummaryErrorProbe />)
        await userEvent.click(screen.getByTestId("generate-ccr-summary"))

        await waitFor((): void => {
            expect(screen.getByTestId("ccr-summary-status")).toHaveTextContent("error")
        })
    })

    it("генерирует summary с несколькими highlights", async (): Promise<void> => {
        server.use(
            http.post(
                "http://localhost:7120/api/v1/repositories/repo-1/ccr-summary/generate",
                () => {
                    return HttpResponse.json({
                        result: {
                            mode: "AUTO",
                            generatedAt: "2026-03-06T12:00:00.000Z",
                            summary: "Deep analysis completed.",
                            highlights: ["Architecture drift", "Coupling increase", "Test decay"],
                        },
                    })
                },
            ),
        )

        renderWithProviders(<CcrSummaryProbe />)
        await userEvent.click(screen.getByTestId("generate-ccr-summary"))

        await waitFor((): void => {
            expect(screen.getByTestId("ccr-summary-status")).toHaveTextContent("AUTO:3")
        })
    })
})
