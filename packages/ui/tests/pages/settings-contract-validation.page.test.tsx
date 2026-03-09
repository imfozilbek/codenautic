import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SettingsContractValidationPage } from "@/pages/settings-contract-validation"
import { renderWithProviders } from "../utils/render"

describe("SettingsContractValidationPage", (): void => {
    it("валидирует контракт, показывает migration hints и применяет preview", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsContractValidationPage />)

        expect(
            screen.getByRole("heading", { level: 1, name: "Contract validation" }),
        ).not.toBeNull()

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
            '"totalViolations": 1',
        )
    })

    it("показывает детали нарушения после клика по файлу в drift overlay treemap", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsContractValidationPage />)

        expect(screen.getByText("Drift overlay CodeCity")).not.toBeNull()

        await user.click(
            screen.getByRole("button", { name: "src/infrastructure/http/review.controller.ts" }),
        )
        await waitFor(() => {
            expect(screen.getByLabelText("Selected drift file violations")).not.toBeNull()
        })
        expect(
            screen.getAllByText("src/infrastructure/http/review.controller.ts").length,
        ).toBeGreaterThan(0)
        expect(screen.getByLabelText("Selected drift file violations")).not.toBeNull()
        expect(
            screen.getByText("Layer violation: infrastructure imports domain directly"),
        ).not.toBeNull()
    })

    it("показывает side-by-side blueprint vs reality с color-coded differences", (): void => {
        renderWithProviders(<SettingsContractValidationPage />)

        expect(screen.getByText("Blueprint vs reality view")).not.toBeNull()
        expect(screen.getByLabelText("Blueprint intended architecture list")).not.toBeNull()
        expect(screen.getByLabelText("Reality architecture list")).not.toBeNull()
        expect(screen.getByText(/Matches: 3 · Missing: 0 · Unexpected: 1/)).not.toBeNull()
        expect(screen.getByLabelText("Architecture differences list")).not.toBeNull()
        expect(
            screen.getAllByText("Dependency direction mismatch for aggregate access path.").length,
        ).toBeGreaterThan(0)
    })

    it("показывает drift trend chart с аннотациями архитектурных изменений", (): void => {
        renderWithProviders(<SettingsContractValidationPage />)

        expect(screen.getByText("Drift trend chart")).not.toBeNull()
        expect(screen.getByLabelText("Drift score trend chart")).not.toBeNull()
        expect(screen.getByLabelText("Architecture change annotations list")).not.toBeNull()
        expect(
            screen.getByText(/ADR-021: Introduced anti-corruption layer for provider boundaries\./),
        ).not.toBeNull()
    })

    it("настраивает drift alerts по severity threshold, violation count и channels", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsContractValidationPage />)

        await user.selectOptions(
            screen.getByLabelText("Drift alert severity threshold"),
            "critical",
        )
        await user.clear(
            screen.getByRole("spinbutton", { name: "Drift alert violation threshold" }),
        )
        await user.type(
            screen.getByRole("spinbutton", { name: "Drift alert violation threshold" }),
            "1",
        )
        await user.click(screen.getByRole("checkbox", { name: "Drift alert channel email" }))
        await user.click(screen.getByRole("button", { name: "Save drift alert config" }))

        await waitFor(() => {
            expect(
                screen.getByText(/Drift alerts saved: severity critical, threshold 1/),
            ).not.toBeNull()
        })
        expect(screen.getByText(/channels: slack, email\./)).not.toBeNull()
    })

    it("валидирует и применяет architecture guardrails из YAML с visual rules preview", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<SettingsContractValidationPage />)

        await user.click(screen.getByRole("button", { name: "Validate guardrails" }))
        await waitFor(() => {
            expect(screen.getByText("Guardrails are valid")).not.toBeNull()
        })
        expect(screen.getByLabelText("Guardrail visual rules list")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Apply guardrails" }))
        await waitFor(() => {
            expect(
                screen.getByText(/Applied architecture guardrails with 3 rules\./),
            ).not.toBeNull()
        })
    })
})
