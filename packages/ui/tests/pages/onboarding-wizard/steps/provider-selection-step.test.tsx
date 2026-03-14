import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { OnboardingWizardPage } from "@/pages/onboarding-wizard"
import { renderWithProviders } from "../../../utils/render"

describe("ProviderSelectionStep", (): void => {
    it("when on step 0, then shows provider select and connect button", (): void => {
        renderWithProviders(<OnboardingWizardPage />)

        expect(screen.getByRole("button", { name: "Connect provider" })).not.toBeNull()
        expect(screen.getByText("Not connected")).not.toBeNull()
    })

    it("when connect provider pressed, then shows connected status chip", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<OnboardingWizardPage />)

        await user.click(screen.getByRole("button", { name: "Connect provider" }))

        expect(screen.getByText(/connected/i)).not.toBeNull()
    })

    it("when provider connected, then next button is available to proceed", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<OnboardingWizardPage />)

        await user.click(screen.getByRole("button", { name: "Connect provider" }))
        const nextButton = screen.getByRole("button", { name: "Next" })

        expect(nextButton).not.toBeNull()
    })
})
