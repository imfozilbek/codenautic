import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    BusFactorTrendChart,
    type IBusFactorTrendSeries,
} from "@/components/graphs/bus-factor-trend-chart"
import { renderWithProviders } from "../utils/render"

const TEST_SERIES: ReadonlyArray<IBusFactorTrendSeries> = [
    {
        moduleId: "src/api",
        moduleLabel: "src/api",
        primaryFileId: "src/api/auth.ts",
        points: [
            {
                timestamp: "2025-10-20T00:00:00.000Z",
                busFactor: 2,
            },
            {
                timestamp: "2025-11-15T00:00:00.000Z",
                busFactor: 1,
                annotation: "Team rotation",
            },
            {
                timestamp: "2026-02-01T00:00:00.000Z",
                busFactor: 1,
            },
        ],
    },
    {
        moduleId: "src/worker",
        moduleLabel: "src/worker",
        primaryFileId: "src/worker/main.ts",
        points: [
            {
                timestamp: "2025-10-20T00:00:00.000Z",
                busFactor: 3,
            },
            {
                timestamp: "2025-11-15T00:00:00.000Z",
                busFactor: 2,
            },
            {
                timestamp: "2026-02-01T00:00:00.000Z",
                busFactor: 2,
                annotation: "New maintainer onboarded",
            },
        ],
    },
]

describe("BusFactorTrendChart", (): void => {
    it("рендерит line chart по модулям и team-change annotations", (): void => {
        renderWithProviders(<BusFactorTrendChart series={TEST_SERIES} />)

        expect(screen.getByLabelText("Bus factor trend chart")).not.toBeNull()
        expect(screen.getByLabelText("Bus factor trend lines")).not.toBeNull()
        expect(screen.getByTestId("bus-factor-line-src/api")).not.toBeNull()
        expect(screen.getByTestId("bus-factor-line-src/worker")).not.toBeNull()
        expect(
            screen.getByLabelText("Bus factor annotation src/api Team rotation"),
        ).not.toBeNull()
    })

    it("вызывает onSelectSeries при выборе module trend", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectSeries = vi.fn()
        renderWithProviders(
            <BusFactorTrendChart series={TEST_SERIES} onSelectSeries={onSelectSeries} />,
        )

        await user.click(
            screen.getByRole("button", { name: "Inspect bus factor trend src/api" }),
        )

        expect(onSelectSeries).toHaveBeenCalledTimes(1)
        expect(onSelectSeries).toHaveBeenCalledWith(
            expect.objectContaining({
                moduleId: "src/api",
                primaryFileId: "src/api/auth.ts",
            }),
        )
    })
})
