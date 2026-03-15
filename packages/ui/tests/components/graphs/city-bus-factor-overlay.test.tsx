import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    CityBusFactorOverlay,
    type ICityBusFactorOverlayEntry,
} from "@/components/codecity/overlays/city-bus-factor-overlay"
import { renderWithProviders } from "../../utils/render"

const MOCK_ENTRIES: ReadonlyArray<ICityBusFactorOverlayEntry> = [
    {
        districtId: "dist-api",
        districtLabel: "API District",
        busFactor: 1,
        fileCount: 12,
        fileIds: ["f1", "f2"],
        primaryFileId: "f1",
    },
    {
        districtId: "dist-core",
        districtLabel: "Core District",
        busFactor: 4,
        fileCount: 30,
        fileIds: ["f3", "f4"],
        primaryFileId: "f3",
    },
]

describe("CityBusFactorOverlay", (): void => {
    it("when rendered with entries, then displays district labels", (): void => {
        renderWithProviders(<CityBusFactorOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText("API District")).not.toBeNull()
        expect(screen.getByText("Core District")).not.toBeNull()
    })

    it("when busFactor is 1, then shows Critical risk badge", (): void => {
        renderWithProviders(<CityBusFactorOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText("Critical")).not.toBeNull()
    })

    it("when busFactor >= 3, then shows Healthy risk badge", (): void => {
        renderWithProviders(<CityBusFactorOverlay entries={MOCK_ENTRIES} />)

        expect(screen.getByText("Healthy")).not.toBeNull()
    })

    it("when onSelectEntry provided and entry clicked, then calls callback", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <CityBusFactorOverlay entries={MOCK_ENTRIES} onSelectEntry={onSelect} />,
        )

        const button = screen.getByRole("button", {
            name: /Inspect bus factor district API District/,
        })
        await user.click(button)

        expect(onSelect).toHaveBeenCalledWith(MOCK_ENTRIES[0])
    })

    it("when activeDistrictId matches, then highlights the active entry", (): void => {
        const { container } = renderWithProviders(
            <CityBusFactorOverlay entries={MOCK_ENTRIES} activeDistrictId="dist-core" />,
        )

        const buttons = container.querySelectorAll("button")
        const secondButton = buttons[1]
        expect(secondButton?.className).toContain("border-accent")
    })
})
