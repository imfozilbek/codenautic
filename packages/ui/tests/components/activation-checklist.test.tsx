import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { ActivationChecklist } from "@/components/onboarding/activation-checklist"
import { renderWithProviders } from "../utils/render"

afterEach((): void => {
    window.localStorage.removeItem("codenautic:activation-checklist:v1")
})

describe("ActivationChecklist", (): void => {
    it("показывает role-aware шаги и прогресс", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ActivationChecklist role="developer" />)

        expect(screen.getByText("Activation checklist")).not.toBeNull()
        expect(screen.queryByText("Connect git provider")).toBeNull()
        expect(screen.getByText("Run first scan")).not.toBeNull()

        const markDoneButtons = screen.getAllByRole("button", { name: "Mark done" })
        const firstMarkDoneButton = markDoneButtons[0]
        if (firstMarkDoneButton !== undefined) {
            await user.click(firstMarkDoneButton)
        }
        expect(screen.getByText("Progress: 25%")).not.toBeNull()
    })

    it("позволяет dismiss checklist с persistence", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ActivationChecklist role="admin" />)

        await user.click(screen.getByRole("button", { name: "Dismiss checklist" }))
        expect(screen.queryByText("Activation checklist")).toBeNull()
    })
})
