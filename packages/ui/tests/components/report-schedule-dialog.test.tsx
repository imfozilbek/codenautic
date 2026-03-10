import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ReportScheduleDialog } from "@/components/reports/report-schedule-dialog"
import { renderWithProviders } from "../utils/render"

describe("ReportScheduleDialog", (): void => {
    it("настраивает scheduled delivery и показывает preview schedule", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportScheduleDialog />)

        await user.click(screen.getByRole("button", { name: "Open schedule dialog" }))
        expect(screen.getByRole("dialog", { name: "Report schedule dialog" })).not.toBeNull()

        await user.clear(screen.getByLabelText("Recipients"))
        await user.type(screen.getByLabelText("Recipients"), "lead@codenautic.app")
        await user.clear(screen.getByLabelText("Cron expression"))
        await user.type(screen.getByLabelText("Cron expression"), "0 8 * * 1-5")
        await user.selectOptions(screen.getByLabelText("Delivery format"), "png")

        expect(screen.getByLabelText("Schedule preview value").textContent).toContain("0 8 * * 1-5")
        expect(screen.getByLabelText("Schedule preview value").textContent).toContain(
            "lead@codenautic.app",
        )
        expect(screen.getByLabelText("Schedule preview value").textContent).toContain("PNG")

        await user.click(screen.getByRole("button", { name: "Save schedule" }))
        await waitFor(() => {
            expect(screen.getByText(/Scheduled delivery saved \(PNG\) for cron/)).not.toBeNull()
        })
    })
})
