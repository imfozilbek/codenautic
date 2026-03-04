import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DashboardMissionControlPage } from "@/pages/dashboard-mission-control.page"
import { renderWithProviders } from "../utils/render"

vi.mock("@/components/dashboard/dashboard-content", () => ({
    DashboardContent: (): JSX.Element => <div>dashboard-content</div>,
}))

describe("DashboardMissionControlPage", (): void => {
    it("показывает freshness panel и provenance drawer", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<DashboardMissionControlPage />)

        expect(screen.getByText("Dashboard Mission Control")).not.toBeNull()
        expect(screen.getByText("Dashboard data freshness")).not.toBeNull()
        expect(screen.getByText("Explainability for release risk")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Open provenance" }))
        expect(screen.getByText("Source data provenance")).not.toBeNull()
        expect(screen.getByText("job-ccr-2026-03-04-7d")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Why this score?" }))
        expect(screen.getByText("Explainability")).not.toBeNull()
        await user.click(screen.getByRole("button", { name: "Export explanation snippet" }))
        expect(screen.getByLabelText("Explainability export snippet")).not.toBeNull()
    })

    it("выполняет refresh/rescan действия из панели freshness", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<DashboardMissionControlPage />)

        await user.click(screen.getByRole("button", { name: "Refresh" }))
        expect(screen.getByText("Dashboard refresh requested.")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Rescan" }))
        expect(screen.getByText("Rescan job was queued from mission control.")).not.toBeNull()
    })
})
