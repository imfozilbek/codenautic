import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    BusFactorTrendChart,
    type IBusFactorTrendSeries,
} from "@/components/graphs/bus-factor-trend-chart"
import { renderWithProviders } from "../../utils/render"

const MOCK_SERIES: ReadonlyArray<IBusFactorTrendSeries> = [
    {
        moduleId: "mod-api",
        moduleLabel: "API Module",
        primaryFileId: "src/api/index.ts",
        points: [
            { timestamp: "2025-01-01T00:00:00Z", busFactor: 2 },
            { timestamp: "2025-02-01T00:00:00Z", busFactor: 3, annotation: "New hire" },
            { timestamp: "2025-03-01T00:00:00Z", busFactor: 4 },
        ],
    },
    {
        moduleId: "mod-cache",
        moduleLabel: "Cache Module",
        primaryFileId: "src/cache/index.ts",
        points: [
            { timestamp: "2025-01-01T00:00:00Z", busFactor: 1 },
            { timestamp: "2025-02-01T00:00:00Z", busFactor: 1 },
        ],
    },
]

describe("BusFactorTrendChart", (): void => {
    it("when rendered with series, then displays title and module labels", (): void => {
        renderWithProviders(<BusFactorTrendChart series={MOCK_SERIES} />)

        expect(screen.getByText("Bus factor trend chart")).not.toBeNull()
        expect(screen.getByText("API Module")).not.toBeNull()
        expect(screen.getByText("Cache Module")).not.toBeNull()
    })

    it("when series is empty, then shows empty state", (): void => {
        renderWithProviders(<BusFactorTrendChart series={[]} />)

        expect(screen.getByText("No bus factor trend data.")).not.toBeNull()
    })

    it("when onSelectSeries provided and module button clicked, then calls callback", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(<BusFactorTrendChart series={MOCK_SERIES} onSelectSeries={onSelect} />)

        const inspectButton = screen.getByRole("button", {
            name: /Inspect bus factor trend API Module/,
        })
        await user.click(inspectButton)

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ moduleId: "mod-api" }))
    })

    it("when annotation is present, then renders annotation text in SVG", (): void => {
        renderWithProviders(<BusFactorTrendChart series={MOCK_SERIES} />)

        expect(screen.getByText("New hire")).not.toBeNull()
    })

    it("when series has valid points, then renders SVG line paths", (): void => {
        const { container } = renderWithProviders(<BusFactorTrendChart series={MOCK_SERIES} />)

        const paths = container.querySelectorAll("[data-testid^='bus-factor-line-']")
        expect(paths.length).toBe(2)
    })
})
