import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { OnboardingWizardPage } from "@/pages/onboarding-wizard"
import { renderWithProviders } from "../../../utils/render"

async function navigateToStep1(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(screen.getByRole("button", { name: "Connect provider" }))
    await user.click(screen.getByRole("button", { name: "Next" }))
}

describe("RepositorySelectionStep", (): void => {
    it("when on step 1 in single mode, then shows repository URL input", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<OnboardingWizardPage />)
        await navigateToStep1(user)

        expect(screen.getByRole("textbox", { name: "Repository URL" })).not.toBeNull()
    })

    it("when invalid URL entered and next pressed, then shows validation error", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<OnboardingWizardPage />)
        await navigateToStep1(user)

        const input = screen.getByRole("textbox", { name: "Repository URL" })
        await user.type(input, "not-a-url")
        await user.click(screen.getByRole("button", { name: "Next" }))

        expect(screen.queryByText(/Введите корректный URL репозитория/)).not.toBeNull()
    })

    it("when valid URL entered, then next button proceeds to step 2", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<OnboardingWizardPage />)
        await navigateToStep1(user)

        const input = screen.getByRole("textbox", { name: "Repository URL" })
        await user.type(input, "https://github.com/owner/repo")
        await user.click(screen.getByRole("button", { name: "Next" }))

        expect(screen.queryByText("Review the selected settings:")).not.toBeNull()
    })
})
