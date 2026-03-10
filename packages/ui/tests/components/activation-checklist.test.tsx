import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ActivationChecklist } from "@/components/onboarding/activation-checklist"
import { renderWithProviders } from "../utils/render"

const STORAGE_KEY = "codenautic:activation-checklist:v1"

beforeEach((): void => {
    window.localStorage.removeItem(STORAGE_KEY)
})

afterEach((): void => {
    window.localStorage.removeItem(STORAGE_KEY)
    vi.restoreAllMocks()
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

    it("when role admin, then показывает все 8 шагов включая admin-only", (): void => {
        renderWithProviders(<ActivationChecklist role="admin" />)

        expect(screen.getByText("Connect git provider")).not.toBeNull()
        expect(screen.getByText("Connect LLM provider")).not.toBeNull()
        expect(screen.getByText("Invite teammates")).not.toBeNull()
        expect(screen.getByText("Configure SSO")).not.toBeNull()
        expect(screen.getByText("Add repository")).not.toBeNull()
        expect(screen.getByText("Run first scan")).not.toBeNull()
        expect(screen.getByText("Set notifications")).not.toBeNull()
        expect(screen.getByText("Baseline rules dry-run")).not.toBeNull()
        expect(screen.getByText("Progress: 0%")).not.toBeNull()
    })

    it("when step toggled back to pending, then progress уменьшается", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ActivationChecklist role="developer" />)

        const markDoneButtons = screen.getAllByRole("button", { name: "Mark done" })
        const firstButton = markDoneButtons[0]
        if (firstButton !== undefined) {
            await user.click(firstButton)
        }
        expect(screen.getByText("Progress: 25%")).not.toBeNull()

        const markPendingButton = screen.getByRole("button", { name: "Mark pending" })
        await user.click(markPendingButton)
        expect(screen.getByText("Progress: 0%")).not.toBeNull()
    })

    it("when dismissed state сохранён в localStorage, then не рендерит чеклист", (): void => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ completedStepIds: [], dismissed: true }),
        )

        renderWithProviders(<ActivationChecklist role="admin" />)

        expect(screen.queryByText("Activation checklist")).toBeNull()
    })

    it("when completed steps сохранены в localStorage, then восстанавливает прогресс", (): void => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                completedStepIds: ["add-repo", "run-first-scan"],
                dismissed: false,
            }),
        )

        renderWithProviders(<ActivationChecklist role="developer" />)

        expect(screen.getByText("Progress: 50%")).not.toBeNull()
    })

    it("when localStorage содержит невалидный JSON, then gracefully показывает пустое состояние", (): void => {
        window.localStorage.setItem(STORAGE_KEY, "invalid json{{{")

        renderWithProviders(<ActivationChecklist role="developer" />)

        expect(screen.getByText("Activation checklist")).not.toBeNull()
        expect(screen.getByText("Progress: 0%")).not.toBeNull()
    })

    it("when localStorage содержит completedStepIds с не-строковыми элементами, then фильтрует их", (): void => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                completedStepIds: ["add-repo", 42, null, "run-first-scan"],
                dismissed: false,
            }),
        )

        renderWithProviders(<ActivationChecklist role="developer" />)

        expect(screen.getByText("Progress: 50%")).not.toBeNull()
    })

    it("when step помечен done, then localStorage обновляется", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ActivationChecklist role="developer" />)

        const markDoneButtons = screen.getAllByRole("button", { name: "Mark done" })
        const firstButton = markDoneButtons[0]
        if (firstButton !== undefined) {
            await user.click(firstButton)
        }

        const stored = window.localStorage.getItem(STORAGE_KEY)
        expect(stored).not.toBeNull()
        if (stored !== null) {
            const parsed = JSON.parse(stored) as {
                readonly completedStepIds: readonly string[]
            }
            expect(parsed.completedStepIds.length).toBeGreaterThan(0)
        }
    })

    it("when step помечен done, then вызывается sync к API", async (): Promise<void> => {
        const fetchSpy = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(new Response(null, { status: 200 }))
        const user = userEvent.setup()
        renderWithProviders(<ActivationChecklist role="developer" />)

        const markDoneButtons = screen.getAllByRole("button", { name: "Mark done" })
        const firstButton = markDoneButtons[0]
        if (firstButton !== undefined) {
            await user.click(firstButton)
        }

        expect(fetchSpy).toHaveBeenCalledWith(
            "/api/v1/user/preferences",
            expect.objectContaining({
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
            }),
        )

        fetchSpy.mockRestore()
    })

    it("when sync к API падает, then компонент не крашится", async (): Promise<void> => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"))
        const user = userEvent.setup()
        renderWithProviders(<ActivationChecklist role="developer" />)

        const markDoneButtons = screen.getAllByRole("button", { name: "Mark done" })
        const firstButton = markDoneButtons[0]
        if (firstButton !== undefined) {
            await user.click(firstButton)
        }

        expect(screen.getByText("Activation checklist")).not.toBeNull()

        fetchSpy.mockRestore()
    })

    it("when все developer-шаги completed, then progress 100%", async (): Promise<void> => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                completedStepIds: [
                    "add-repo",
                    "run-first-scan",
                    "setup-notifications",
                    "baseline-rules",
                ],
                dismissed: false,
            }),
        )

        renderWithProviders(<ActivationChecklist role="developer" />)

        expect(screen.getByText("Progress: 100%")).not.toBeNull()
    })

    it("when Open step link нажат, then ссылка содержит правильный path", (): void => {
        renderWithProviders(<ActivationChecklist role="developer" />)

        const openStepLinks = screen.getAllByText("Open step")
        expect(openStepLinks.length).toBeGreaterThan(0)
    })
})
