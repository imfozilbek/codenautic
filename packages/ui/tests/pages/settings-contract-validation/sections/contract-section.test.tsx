import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ContractSection } from "@/pages/settings-contract-validation/sections/contract-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockContractState } from "./mock-contract-state"

describe("ContractSection", (): void => {
    it("when rendered, then shows contract json textarea and action buttons", (): void => {
        const state = createMockContractState()
        renderWithProviders(<ContractSection state={state} />)

        expect(screen.getByLabelText("Contract json")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Validate contract" })).not.toBeNull()
        expect(screen.getByRole("button", { name: "Apply validated contract" })).not.toBeNull()
    })

    it("when contract is valid, then shows contract is valid alert with preview summary", (): void => {
        const state = createMockContractState()
        renderWithProviders(<ContractSection state={state} />)

        expect(screen.getByText("Contract is valid")).not.toBeNull()
        expect(screen.getByText("theme-library contract v1")).not.toBeNull()
    })

    it("when contract has errors, then shows contract validation errors", (): void => {
        const state = createMockContractState({
            validationResult: {
                errors: ["Invalid JSON format", "Missing required field: type"],
                migrationHints: ["Consider upgrading to schema v2"],
            },
        })
        renderWithProviders(<ContractSection state={state} />)

        expect(screen.getByText("Contract validation errors")).not.toBeNull()
        expect(screen.getByText("Invalid JSON format")).not.toBeNull()
        expect(screen.getByText("Migration hints")).not.toBeNull()
        expect(screen.getByText("Consider upgrading to schema v2")).not.toBeNull()
    })
})
