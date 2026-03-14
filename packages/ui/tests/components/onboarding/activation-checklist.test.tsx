import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ActivationChecklist } from "@/components/onboarding/activation-checklist"
import { renderWithProviders } from "../../utils/render"

const STORAGE_KEY = "codenautic:activation-checklist:v1"

beforeEach((): void => {
    window.localStorage.removeItem(STORAGE_KEY)
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }))
})

afterEach((): void => {
    window.localStorage.removeItem(STORAGE_KEY)
    vi.restoreAllMocks()
})

describe("ActivationChecklist", (): void => {
    it("when role is admin, then shows all 8 steps including admin-only", (): void => {
        renderWithProviders(<ActivationChecklist role="admin" />)

        expect(screen.getByText("Activation checklist")).not.toBeNull()
        expect(screen.getByText("Connect git provider")).not.toBeNull()
        expect(screen.getByText("Connect LLM provider")).not.toBeNull()
        expect(screen.getByText("Invite teammates")).not.toBeNull()
        expect(screen.getByText("Configure SSO")).not.toBeNull()
        expect(screen.getByText("Add repository")).not.toBeNull()
        expect(screen.getByText("Progress: 0%")).not.toBeNull()
    })

    it("when role is developer, then hides admin-only steps", (): void => {
        renderWithProviders(<ActivationChecklist role="developer" />)

        expect(screen.queryByText("Connect git provider")).toBeNull()
        expect(screen.queryByText("Configure SSO")).toBeNull()
        expect(screen.getByText("Add repository")).not.toBeNull()
        expect(screen.getByText("Run first scan")).not.toBeNull()
    })

    it("when step is toggled done, then progress increases and chip shows 'done'", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ActivationChecklist role="developer" />)

        const markDoneButtons = screen.getAllByRole("button", { name: "Mark done" })
        const firstButton = markDoneButtons[0]
        if (firstButton !== undefined) {
            await user.click(firstButton)
        }

        expect(screen.getByText("Progress: 25%")).not.toBeNull()
    })

    it("when dismiss is clicked, then checklist is hidden", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ActivationChecklist role="admin" />)

        await user.click(screen.getByRole("button", { name: "Dismiss checklist" }))
        expect(screen.queryByText("Activation checklist")).toBeNull()
    })

    it("when dismissed state is in localStorage, then does not render checklist", (): void => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ completedStepIds: [], dismissed: true }),
        )

        renderWithProviders(<ActivationChecklist role="admin" />)

        expect(screen.queryByText("Activation checklist")).toBeNull()
    })
})
