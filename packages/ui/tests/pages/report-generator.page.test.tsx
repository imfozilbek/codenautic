import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ReportGeneratorPage } from "@/pages/report-generator.page"
import { renderWithProviders } from "../utils/render"

describe("ReportGeneratorPage", (): void => {
    it("настраивает report configuration и показывает preview перед генерацией", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportGeneratorPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Report generator" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Open reports list" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Open latest report" })).not.toBeNull()

        await user.selectOptions(screen.getByLabelText("Report type"), "delivery")
        await user.selectOptions(screen.getByLabelText("Report format"), "html")
        await user.clear(screen.getByLabelText("Report date range start"))
        await user.type(screen.getByLabelText("Report date range start"), "2026-02-01")
        await user.clear(screen.getByLabelText("Report date range end"))
        await user.type(screen.getByLabelText("Report date range end"), "2026-02-28")

        await user.click(screen.getByRole("button", { name: "Preview report" }))
        await waitFor(() => {
            expect(
                screen.getByText(
                    /Preview ready: delivery report from 2026-02-01 to 2026-02-28 in HTML\./,
                ),
            ).not.toBeNull()
        })

        expect(screen.getByLabelText("Report preview payload").textContent).toContain(
            "\"type\": \"delivery\"",
        )
        expect(screen.getByLabelText("Report preview payload").textContent).toContain(
            "\"format\": \"html\"",
        )

        await user.click(screen.getByRole("button", { name: "Generate report" }))
        await waitFor(() => {
            expect(
                screen.getByText(/Report generation queued for delivery \(HTML\) with 2 sections\./),
            ).not.toBeNull()
        })
    })
})
