import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ReportViewerPage } from "@/pages/report-viewer.page"
import { renderWithProviders } from "../utils/render"

describe("ReportViewerPage", (): void => {
    it("отображает generated report, интерактивные charts и export/share actions", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportViewerPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Report viewer" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Open reports list" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Open report generator" })).not.toBeNull()
        expect(screen.getByLabelText("Report trend chart")).not.toBeNull()
        expect(screen.getByLabelText("Report sections distribution chart")).not.toBeNull()

        await user.selectOptions(screen.getByLabelText("Report chart metric"), "deliveryVelocity")
        await user.click(screen.getByRole("button", { name: "Download PDF" }))
        await waitFor(() => {
            expect(screen.getByText("Download prepared in PDF format.")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Download PNG" }))
        await waitFor(() => {
            expect(screen.getByText("Download prepared in PNG format.")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Generate share link" }))
        await waitFor(() => {
            expect(
                screen.getByText("https://codenautic.app/reports/generated/2026-q1-weekly"),
            ).not.toBeNull()
        })
        expect(screen.getByLabelText("Report share link")).not.toBeNull()
    })
})
