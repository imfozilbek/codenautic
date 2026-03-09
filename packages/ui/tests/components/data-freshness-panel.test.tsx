import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DataFreshnessPanel } from "@/components/infrastructure/data-freshness-panel"
import { renderWithProviders } from "../utils/render"

function createDefaultProps(): {
    readonly title: string
    readonly lastUpdatedAt: string
    readonly staleThresholdMinutes: number
    readonly isRefreshing: boolean
    readonly provenance: {
        readonly source: string
        readonly jobId: string
        readonly repository: string
        readonly branch: string
        readonly commit: string
        readonly dataWindow: string
        readonly isPartial: boolean
        readonly hasFailures: boolean
        readonly diagnosticsHref: string
    }
    readonly onRefresh: () => void
    readonly onRescan: () => void
} {
    return {
        isRefreshing: false,
        lastUpdatedAt: new Date().toISOString(),
        onRefresh: vi.fn<() => void>(),
        onRescan: vi.fn<() => void>(),
        provenance: {
            branch: "main",
            commit: "abc123",
            dataWindow: "last 30 days",
            diagnosticsHref: "/diagnostics/job-1",
            hasFailures: false,
            isPartial: false,
            jobId: "job-1",
            repository: "platform/core",
            source: "scan-worker",
        },
        staleThresholdMinutes: 45,
        title: "Architecture health",
    }
}

describe("DataFreshnessPanel", (): void => {
    it("when data is fresh, then shows fresh chip", (): void => {
        const props = createDefaultProps()
        renderWithProviders(<DataFreshnessPanel {...props} />)

        expect(screen.getByText("fresh")).not.toBeNull()
        expect(screen.getByText("Architecture health")).not.toBeNull()
    })

    it("when data is stale (past threshold), then shows stale chip", (): void => {
        const oldDate = new Date(Date.now() - 120 * 60_000).toISOString()
        const props = { ...createDefaultProps(), lastUpdatedAt: oldDate }
        renderWithProviders(<DataFreshnessPanel {...props} />)

        expect(screen.getByText("stale")).not.toBeNull()
    })

    it("when isRefreshing is true, then shows refreshing chip", (): void => {
        const props = { ...createDefaultProps(), isRefreshing: true }
        renderWithProviders(<DataFreshnessPanel {...props} />)

        expect(screen.getByText("refreshing")).not.toBeNull()
    })

    it("when lastUpdatedAt is invalid, then shows stale chip", (): void => {
        const props = { ...createDefaultProps(), lastUpdatedAt: "not-a-date" }
        renderWithProviders(<DataFreshnessPanel {...props} />)

        expect(screen.getByText("stale")).not.toBeNull()
    })

    it("when refresh button is clicked, then calls onRefresh", async (): Promise<void> => {
        const user = userEvent.setup()
        const props = createDefaultProps()
        renderWithProviders(<DataFreshnessPanel {...props} />)

        await user.click(screen.getByRole("button", { name: "Refresh" }))

        expect(props.onRefresh).toHaveBeenCalledTimes(1)
    })

    it("when rescan button is clicked, then calls onRescan", async (): Promise<void> => {
        const user = userEvent.setup()
        const props = createDefaultProps()
        renderWithProviders(<DataFreshnessPanel {...props} />)

        await user.click(screen.getByRole("button", { name: "Rescan" }))

        expect(props.onRescan).toHaveBeenCalledTimes(1)
    })

    it("when open provenance is clicked, then shows provenance drawer content", async (): Promise<void> => {
        const user = userEvent.setup()
        const props = createDefaultProps()
        renderWithProviders(<DataFreshnessPanel {...props} />)

        await user.click(screen.getByRole("button", { name: "Open provenance" }))

        expect(screen.getByText("Source data provenance")).not.toBeNull()
        expect(screen.getByText("platform/core")).not.toBeNull()
        expect(screen.getByText("abc123")).not.toBeNull()
        expect(screen.getByText("scan-worker")).not.toBeNull()
    })
})
