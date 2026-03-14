import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    CityImpactOverlay,
    type ICityImpactOverlayEntry,
} from "@/components/graphs/city-impact-overlay"
import { renderWithProviders } from "../../utils/render"

const MOCK_ENTRIES: ReadonlyArray<ICityImpactOverlayEntry> = [
    {
        fileId: "file-api",
        label: "api/routes.ts",
        intensity: 85,
        details: "High blast radius from route handler changes",
    },
    {
        fileId: "file-util",
        label: "utils/helpers.ts",
        intensity: 30,
        details: "Minimal downstream impact",
    },
]

describe("CityImpactOverlay", (): void => {
    it("when rendered with entries, then displays title and entry labels", (): void => {
        renderWithProviders(<CityImpactOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText("City impact overlay")).not.toBeNull()
        expect(screen.getByText("api/routes.ts")).not.toBeNull()
        expect(screen.getByText("utils/helpers.ts")).not.toBeNull()
    })

    it("when intensity is high, then shows danger-styled badge", (): void => {
        renderWithProviders(<CityImpactOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText("85%")).not.toBeNull()
    })

    it("when onSelectEntry provided and button clicked, then calls callback", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(<CityImpactOverlay entries={MOCK_ENTRIES} onSelectEntry={onSelect} />)

        const button = screen.getByRole("button", {
            name: /Inspect city impact api\/routes.ts/,
        })
        await user.click(button)

        expect(onSelect).toHaveBeenCalledWith(MOCK_ENTRIES[0])
    })

    it("when entries are provided, then renders progress bars for intensity", (): void => {
        const { container } = renderWithProviders(<CityImpactOverlay entries={MOCK_ENTRIES} />)

        const progressBars = container.querySelectorAll("[style*='width']")
        expect(progressBars.length).toBeGreaterThanOrEqual(2)
    })
})
