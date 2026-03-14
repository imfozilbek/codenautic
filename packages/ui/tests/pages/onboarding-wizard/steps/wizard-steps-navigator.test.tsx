import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { OnboardingWizardPage } from "@/pages/onboarding-wizard"
import { renderWithProviders } from "../../../utils/render"

describe("WizardStepsNavigator", (): void => {
    it("when on step 0, then back button is disabled and next button is visible", (): void => {
        renderWithProviders(<OnboardingWizardPage />)

        const backButton = screen.getByRole("button", { name: "Back" })
        const nextButton = screen.getByRole("button", { name: "Next" })

        expect(backButton).not.toBeNull()
        expect(
            backButton.hasAttribute("disabled") ||
                backButton.getAttribute("aria-disabled") === "true",
        ).toBe(true)
        expect(nextButton).not.toBeNull()
    })

    it("when navigated to step 1, then back button becomes enabled", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<OnboardingWizardPage />)

        await user.click(screen.getByRole("button", { name: "Connect provider" }))
        await user.click(screen.getByRole("button", { name: "Next" }))

        const backButton = screen.getByRole("button", { name: "Back" })
        expect(
            backButton.hasAttribute("disabled") === false &&
                backButton.getAttribute("aria-disabled") !== "true",
        ).toBe(true)
    })

    it("when on final step, then shows launch scan button instead of next", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<OnboardingWizardPage />)

        await user.click(screen.getByRole("button", { name: "Connect provider" }))
        await user.click(screen.getByRole("button", { name: "Next" }))

        await user.type(
            screen.getByRole("textbox", { name: "Repository URL" }),
            "https://github.com/owner/repo",
        )
        await user.click(screen.getByRole("button", { name: "Next" }))

        expect(screen.getByRole("button", { name: "Launch scan" })).not.toBeNull()
        expect(screen.queryByRole("button", { name: "Next" })).toBeNull()
    })
})
