import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DashboardMissionControlPage } from "@/pages/dashboard-mission-control.page"
import { renderWithProviders } from "../utils/render"

vi.mock("@/components/dashboard/dashboard-content", () => ({
    DashboardContent: (): React.JSX.Element => <div>dashboard-content</div>,
}))

describe("DashboardMissionControlPage", (): void => {
    it("показывает freshness panel и provenance drawer", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<DashboardMissionControlPage />)

        expect(await screen.findByText("Dashboard Mission Control")).not.toBeNull()
        expect(screen.getByText("Dashboard data freshness")).not.toBeNull()
        expect(screen.getByText("Explainability for release risk")).not.toBeNull()
        expect(screen.getByText("Flow metrics")).not.toBeNull()
        expect(
            screen.getByText(
                "Track flow efficiency and delivery capacity dynamics across recent windows.",
            ),
        ).not.toBeNull()
        expect(screen.getByText("Team activity")).not.toBeNull()
        expect(screen.getByText("CCRs merged by developer in selected date range.")).not.toBeNull()
        expect(screen.getByText("Token usage dashboard")).not.toBeNull()
        expect(
            screen.getByText("Usage by model, cost breakdown and trend chart for selected range."),
        ).not.toBeNull()
        expect(screen.getByText("Architecture health")).not.toBeNull()
        expect(
            screen.getByText(
                "Health score, layer violations and DDD compliance in one architecture widget.",
            ),
        ).not.toBeNull()
        expect(screen.getByRole("link", { name: "Open Graph Explorer" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Open Causal Analysis" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Open Impact Planning" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Open Refactoring Planner" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Open Knowledge Map" })).not.toBeNull()
        expect(screen.getByRole("link", { name: "Open Reports" })).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Open provenance" }))
        expect(await screen.findByText("Source data provenance")).not.toBeNull()
        expect(await screen.findByText("job-ccr-2026-03-04-7d")).not.toBeNull()
    })

    it("открывает explainability drawer и экспортирует snippet", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<DashboardMissionControlPage />)

        await user.click(await screen.findByRole("button", { name: "Why this score?" }))
        expect(await screen.findByText("Explainability")).not.toBeNull()
        await user.click(screen.getByRole("button", { name: "Export explanation snippet" }))
        expect(await screen.findByLabelText("Explainability export snippet")).not.toBeNull()
    })

    it("выполняет refresh/rescan действия из панели freshness", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<DashboardMissionControlPage />)

        await user.click(await screen.findByRole("button", { name: "Refresh" }))
        expect(screen.getByText("Dashboard refresh requested.")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Rescan" }))
        expect(screen.getByText("Rescan job was queued from mission control.")).not.toBeNull()
    })

    it("сохраняет workspace personalization и генерирует share link", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<DashboardMissionControlPage />)

        await user.selectOptions(
            await screen.findByRole("combobox", { name: "Layout preset" }),
            "ops",
        )
        await user.click(screen.getByRole("checkbox", { name: "Pin /issues" }))
        await user.click(screen.getByRole("button", { name: "Save personalization" }))

        expect(screen.getByText("Workspace personalization saved.")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Generate share link" }))
        expect(screen.getByRole("textbox", { name: "Workspace share link" })).not.toBeNull()
    })
})
