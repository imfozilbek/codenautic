import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    DistrictTrendIndicators,
    type IDistrictTrendIndicatorEntry,
} from "@/components/codecity/district-trend-indicators"
import { renderWithProviders } from "../../utils/render"

const MOCK_ENTRIES: ReadonlyArray<IDistrictTrendIndicatorEntry> = [
    {
        districtId: "dist-api",
        districtLabel: "API District",
        trend: "improving",
        deltaPercentage: 15,
        fileCount: 12,
        primaryFileId: "f1",
        affectedFileIds: ["f1", "f2"],
    },
    {
        districtId: "dist-cache",
        districtLabel: "Cache District",
        trend: "degrading",
        deltaPercentage: 8,
        fileCount: 7,
        primaryFileId: "f3",
        affectedFileIds: ["f3"],
    },
    {
        districtId: "dist-core",
        districtLabel: "Core District",
        trend: "stable",
        deltaPercentage: 0,
        fileCount: 20,
        primaryFileId: "f5",
        affectedFileIds: ["f5"],
    },
]

describe("DistrictTrendIndicators", (): void => {
    it("when rendered with entries, then displays district labels", (): void => {
        renderWithProviders(<DistrictTrendIndicators entries={MOCK_ENTRIES} />)

        expect(screen.getByText("District trend indicators")).not.toBeNull()
        expect(screen.getByText("API District")).not.toBeNull()
        expect(screen.getByText("Cache District")).not.toBeNull()
        expect(screen.getByText("Core District")).not.toBeNull()
    })

    it("when trend is improving, then shows Improving badge", (): void => {
        renderWithProviders(<DistrictTrendIndicators entries={MOCK_ENTRIES} />)

        expect(screen.getByText("Improving")).not.toBeNull()
    })

    it("when trend is degrading, then shows Degrading badge", (): void => {
        renderWithProviders(<DistrictTrendIndicators entries={MOCK_ENTRIES} />)

        expect(screen.getByText("Degrading")).not.toBeNull()
    })

    it("when onSelectEntry provided and entry clicked, then calls callback", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <DistrictTrendIndicators entries={MOCK_ENTRIES} onSelectEntry={onSelect} />,
        )

        const button = screen.getByRole("button", {
            name: /Inspect district trend API District/,
        })
        await user.click(button)

        expect(onSelect).toHaveBeenCalledWith(MOCK_ENTRIES[0])
    })

    it("when activeDistrictId matches, then highlights the active entry", (): void => {
        const { container } = renderWithProviders(
            <DistrictTrendIndicators entries={MOCK_ENTRIES} activeDistrictId="dist-cache" />,
        )

        const buttons = container.querySelectorAll("button")
        const secondButton = buttons[1]
        expect(secondButton?.className).toContain("border-accent")
    })
})
