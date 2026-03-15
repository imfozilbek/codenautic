import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    CityOwnershipOverlay,
    type ICityOwnershipOverlayOwnerEntry,
} from "@/components/codecity/overlays/city-ownership-overlay"
import { renderWithProviders } from "../../utils/render"

const MOCK_OWNERS: ReadonlyArray<ICityOwnershipOverlayOwnerEntry> = [
    {
        ownerId: "owner-1",
        ownerName: "Alice",
        color: "#3b82f6",
        fileIds: ["f1", "f2", "f3"],
        primaryFileId: "f1",
    },
    {
        ownerId: "owner-2",
        ownerName: "Bob",
        ownerAvatarUrl: "https://example.com/bob.png",
        color: "#ef4444",
        fileIds: ["f4"],
        primaryFileId: "f4",
    },
]

describe("CityOwnershipOverlay", (): void => {
    it("when rendered with owners, then displays title and owner names", (): void => {
        renderWithProviders(<CityOwnershipOverlay owners={MOCK_OWNERS} isEnabled={true} />)

        expect(screen.getByText("Ownership overlay")).not.toBeNull()
        expect(screen.getByText("Alice")).not.toBeNull()
        expect(screen.getByText("Bob")).not.toBeNull()
    })

    it("when isEnabled is true, then toggle button says Disable", (): void => {
        renderWithProviders(<CityOwnershipOverlay owners={MOCK_OWNERS} isEnabled={true} />)

        const toggleButton = screen.getByRole("button", {
            name: "Disable ownership colors",
        })
        expect(toggleButton).toHaveAttribute("aria-pressed", "true")
    })

    it("when isEnabled is false, then toggle button says Enable", (): void => {
        renderWithProviders(<CityOwnershipOverlay owners={MOCK_OWNERS} isEnabled={false} />)

        const toggleButton = screen.getByRole("button", {
            name: "Enable ownership colors",
        })
        expect(toggleButton).toHaveAttribute("aria-pressed", "false")
    })

    it("when toggle button clicked, then calls onToggleEnabled", async (): Promise<void> => {
        const user = userEvent.setup()
        const onToggle = vi.fn()

        renderWithProviders(
            <CityOwnershipOverlay
                owners={MOCK_OWNERS}
                isEnabled={true}
                onToggleEnabled={onToggle}
            />,
        )

        const toggleButton = screen.getByRole("button", {
            name: "Disable ownership colors",
        })
        await user.click(toggleButton)

        expect(onToggle).toHaveBeenCalledWith(false)
    })

    it("when owner button clicked, then calls onSelectOwner", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <CityOwnershipOverlay owners={MOCK_OWNERS} isEnabled={true} onSelectOwner={onSelect} />,
        )

        const button = screen.getByRole("button", {
            name: /Focus ownership Alice/,
        })
        await user.click(button)

        expect(onSelect).toHaveBeenCalledWith(MOCK_OWNERS[0])
    })
})
