import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    CityRefactoringOverlay,
    type ICityRefactoringOverlayEntry,
} from "@/components/codecity/overlays/city-refactoring-overlay"
import { renderWithProviders } from "../../utils/render"

const MOCK_ENTRIES: ReadonlyArray<ICityRefactoringOverlayEntry> = [
    {
        fileId: "file-1",
        label: "src/api/handler.ts",
        priority: "critical",
        details: "High cyclomatic complexity",
    },
    {
        fileId: "file-2",
        label: "src/db/queries.ts",
        priority: "high",
        details: "Code duplication detected",
    },
    {
        fileId: "file-3",
        label: "src/utils/format.ts",
        priority: "medium",
        details: "Minor style issues",
    },
]

describe("CityRefactoringOverlay", (): void => {
    it("when rendered with entries, then displays title and entry labels", (): void => {
        renderWithProviders(<CityRefactoringOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText("City refactoring overlay")).not.toBeNull()
        expect(screen.getByText("src/api/handler.ts")).not.toBeNull()
        expect(screen.getByText("src/db/queries.ts")).not.toBeNull()
    })

    it("when priority is critical, then shows critical badge", (): void => {
        renderWithProviders(<CityRefactoringOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText("critical")).not.toBeNull()
    })

    it("when onSelectEntry provided and button clicked, then calls callback", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <CityRefactoringOverlay entries={MOCK_ENTRIES} onSelectEntry={onSelect} />,
        )

        const button = screen.getByRole("button", {
            name: /Inspect refactoring overlay src\/api\/handler.ts/,
        })
        await user.click(button)

        expect(onSelect).toHaveBeenCalledWith(MOCK_ENTRIES[0])
    })

    it("when entry has details, then displays detail text", (): void => {
        renderWithProviders(<CityRefactoringOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText("High cyclomatic complexity")).not.toBeNull()
        expect(screen.getByText("Code duplication detected")).not.toBeNull()
    })
})
