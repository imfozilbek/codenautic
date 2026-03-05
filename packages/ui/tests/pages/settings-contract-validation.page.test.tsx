import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsContractValidationPage } from "@/pages/settings-contract-validation.page"
import { renderWithProviders } from "../utils/render"

describe("SettingsContractValidationPage", (): void => {
    it("валидирует контракт, показывает migration hints и применяет preview", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsContractValidationPage />)

        expect(screen.getByRole("heading", { level: 1, name: "Contract validation" })).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Validate contract" }))
        await waitFor(() => {
            expect(screen.getByText("Contract is valid")).not.toBeNull()
        })
        expect(screen.getByText("Migration hints")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Apply validated contract" }))
        await waitFor(() => {
            expect(screen.getByText(/Applied theme-library contract v1/)).not.toBeNull()
        })
    })

    it("возвращает actionable errors для некорректного JSON", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsContractValidationPage />)

        await user.clear(screen.getByRole("textbox", { name: "Contract json" }))
        fireEvent.change(screen.getByRole("textbox", { name: "Contract json" }), {
            target: { value: "{bad json" },
        })
        await user.click(screen.getByRole("button", { name: "Validate contract" }))

        await waitFor(() => {
            expect(screen.getByText("Contract validation errors")).not.toBeNull()
        })
        expect(screen.getByText(/Invalid JSON format/)).not.toBeNull()
    })

    it("валидирует architecture blueprint yaml и показывает visual preview", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsContractValidationPage />)

        expect(screen.getByLabelText("Blueprint syntax highlight preview")).not.toBeNull()
        expect(screen.getByLabelText("Blueprint visual nodes list")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Validate blueprint" }))
        await waitFor(() => {
            expect(screen.getByText("Blueprint is valid")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Apply blueprint" }))
        await waitFor(() => {
            expect(screen.getByText(/Applied architecture blueprint/)).not.toBeNull()
        })
    })

    it("показывает ошибки для blueprint без обязательных секций", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsContractValidationPage />)

        await user.clear(screen.getByRole("textbox", { name: "Architecture blueprint yaml" }))
        fireEvent.change(screen.getByRole("textbox", { name: "Architecture blueprint yaml" }), {
            target: {
                value: "version: 1\nlayers:\n  - name: domain",
            },
        })
        await user.click(screen.getByRole("button", { name: "Validate blueprint" }))

        await waitFor(() => {
            expect(screen.getByText("Blueprint validation errors")).not.toBeNull()
        })
        expect(screen.getByText("Blueprint must include `rules` section.")).not.toBeNull()
    })

    it("фильтрует, сортирует и экспортирует drift analysis report", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsContractValidationPage />)

        expect(
            screen.getByText("Layer violation: infrastructure imports domain directly"),
        ).not.toBeNull()
        expect(
            screen.getByText("Dependency cycle between application and infrastructure"),
        ).not.toBeNull()

        await user.selectOptions(screen.getByLabelText("Drift severity filter"), "critical")
        await waitFor(() => {
            expect(
                screen.getByText("Dependency cycle between application and infrastructure"),
            ).not.toBeNull()
        })
        expect(
            screen.queryByText("Layer violation: infrastructure imports domain directly"),
        ).toBeNull()

        await user.selectOptions(screen.getByLabelText("Drift report sort mode"), "files-desc")
        await user.clear(screen.getByRole("textbox", { name: "Drift report search query" }))
        await user.type(screen.getByRole("textbox", { name: "Drift report search query" }), "cycle")

        await user.click(screen.getByRole("button", { name: "Export drift report" }))
        await waitFor(() => {
            expect(screen.getByText(/Exported drift report with 1 violations/)).not.toBeNull()
        })
        expect(screen.getByLabelText("Drift report export payload").textContent).toContain(
            "\"totalViolations\": 1",
        )
    })
})
