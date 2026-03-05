import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ReportTemplateEditor } from "@/components/reports/report-template-editor"
import { renderWithProviders } from "../utils/render"

describe("ReportTemplateEditor", (): void => {
    it("редактирует template branding/sections и сохраняет конфигурацию", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ReportTemplateEditor />)

        await user.clear(screen.getByLabelText("Template name"))
        await user.type(screen.getByLabelText("Template name"), "Leadership weekly digest")
        await user.clear(screen.getByLabelText("Template brand logo"))
        await user.type(screen.getByLabelText("Template brand logo"), "https://cdn.codenautic.app/lead.svg")
        fireEvent.change(screen.getByLabelText("Template accent color"), {
            target: { value: "#0f766e" },
        })

        await user.click(screen.getByRole("button", { name: "Move down section executive-summary" }))
        await user.click(screen.getByRole("checkbox", { name: "Template section enabled risks-and-actions" }))

        expect(screen.getByLabelText("Template preview summary").textContent).toContain(
            "Leadership weekly digest",
        )
        expect(screen.getByLabelText("Template preview summary").textContent).toContain(
            "https://cdn.codenautic.app/lead.svg",
        )
        expect(screen.getByLabelText("Template preview summary").textContent).toContain("#0f766e")

        await user.click(screen.getByRole("button", { name: "Save template" }))
        await waitFor(() => {
            expect(screen.getByText(/Template saved: Leadership weekly digest/)).not.toBeNull()
        })
    })
})
