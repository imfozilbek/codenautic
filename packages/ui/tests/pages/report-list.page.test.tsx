import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ReportListPage } from "@/pages/report-list.page"
import { renderWithProviders } from "../utils/render"

describe("ReportListPage", (): void => {
    it("показывает список generated reports, фильтры и delete/regenerate actions", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportListPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Report list" })).not.toBeNull()
        expect(screen.getByLabelText("Generated reports list")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Open generator" })).not.toBeNull()
        expect(screen.getAllByRole("button", { name: "Open viewer" }).length).toBeGreaterThan(0)

        await user.selectOptions(screen.getByLabelText("Report list type filter"), "architecture")
        expect(screen.getByText("Architecture Weekly Snapshot")).not.toBeNull()
        expect(screen.queryByText("Delivery Throughput Pulse")).toBeNull()

        await user.selectOptions(screen.getByLabelText("Report list type filter"), "all")
        await user.click(screen.getByRole("button", { name: "Regenerate report-001" }))
        await waitFor(() => {
            expect(screen.getByText("Regeneration queued for report report-001.")).not.toBeNull()
        })
        const regeneratedRow = screen.getByLabelText("Report row report-001")
        expect(within(regeneratedRow).getByText("queued")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Delete report-003" }))
        await waitFor(() => {
            expect(screen.queryByLabelText("Report row report-003")).toBeNull()
        })

        await user.type(screen.getByLabelText("Report list date from"), "2026-03-06")
        expect(screen.getByText("Architecture Drift Mid-Sprint")).not.toBeNull()
    })
})
