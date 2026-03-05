import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    CityRefactoringOverlay,
    type ICityRefactoringOverlayEntry,
} from "@/components/graphs/city-refactoring-overlay"
import { renderWithProviders } from "../utils/render"

const TEST_ENTRIES: ReadonlyArray<ICityRefactoringOverlayEntry> = [
    {
        details: "ROI 92 · Risk 88 · Effort 7",
        fileId: "src/adapters/queue.ts",
        label: "src/adapters/queue.ts",
        priority: "critical",
    },
    {
        details: "ROI 74 · Risk 65 · Effort 5",
        fileId: "src/services/retry.ts",
        label: "src/services/retry.ts",
        priority: "high",
    },
]

describe("CityRefactoringOverlay", (): void => {
    it("рендерит список приоритетных building entries", (): void => {
        renderWithProviders(<CityRefactoringOverlay entries={TEST_ENTRIES} />)

        expect(screen.getByText("City refactoring overlay")).not.toBeNull()
        expect(screen.getByText("src/adapters/queue.ts")).not.toBeNull()
        expect(screen.getByText("ROI 92 · Risk 88 · Effort 7")).not.toBeNull()
        expect(screen.getByText("critical")).not.toBeNull()
    })

    it("вызывает callback при выборе overlay entry", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectEntry = vi.fn()
        renderWithProviders(
            <CityRefactoringOverlay entries={TEST_ENTRIES} onSelectEntry={onSelectEntry} />,
        )

        await user.click(
            screen.getByRole("button", {
                name: "Inspect refactoring overlay src/adapters/queue.ts",
            }),
        )
        expect(onSelectEntry).toHaveBeenCalledTimes(1)
        expect(onSelectEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                fileId: "src/adapters/queue.ts",
            }),
        )
    })
})
