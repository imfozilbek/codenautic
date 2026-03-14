import { screen } from "@testing-library/react"

import { describe, expect, it } from "vitest"

import { BlueprintSection } from "@/pages/settings-contract-validation/sections/blueprint-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockContractState } from "./mock-contract-state"

describe("BlueprintSection", (): void => {
    it("when rendered, then shows blueprint yaml editor and action buttons", (): void => {
        const state = createMockContractState()
        renderWithProviders(<BlueprintSection state={state} />)

        expect(screen.getByLabelText("Architecture blueprint yaml")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Validate blueprint" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Apply blueprint" })).not.toBeNull()
    })

    it("when no validation errors, then shows blueprint is valid alert", (): void => {
        const state = createMockContractState()
        renderWithProviders(<BlueprintSection state={state} />)

        expect(screen.getByText("Blueprint is valid")).not.toBeNull()
        expect(screen.getByText(/Visual nodes: 2/)).not.toBeNull()
    })

    it("when rendered, then shows syntax highlight preview and visual nodes list", (): void => {
        const state = createMockContractState()
        renderWithProviders(<BlueprintSection state={state} />)

        expect(screen.getByLabelText("Blueprint syntax highlight preview")).not.toBeNull()
        expect(screen.getByLabelText("Blueprint visual nodes list")).not.toBeNull()
        expect(screen.getAllByText("domain").length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText("application").length).toBeGreaterThanOrEqual(1)
    })

    it("when validation has errors, then shows blueprint validation errors alert", (): void => {
        const state = createMockContractState({
            blueprintValidationResult: {
                errors: ["Invalid YAML structure", "Missing required field: layers"],
                nodes: [],
            },
        })
        renderWithProviders(<BlueprintSection state={state} />)

        expect(screen.getByText("Blueprint validation errors")).not.toBeNull()
        expect(screen.getByText("Invalid YAML structure")).not.toBeNull()
        expect(screen.getByText("Missing required field: layers")).not.toBeNull()
    })
})
