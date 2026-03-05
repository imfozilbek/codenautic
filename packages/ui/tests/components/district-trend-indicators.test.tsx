import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    DistrictTrendIndicators,
    type IDistrictTrendIndicatorEntry,
} from "@/components/graphs/district-trend-indicators"
import { renderWithProviders } from "../utils/render"

const TEST_ENTRIES: ReadonlyArray<IDistrictTrendIndicatorEntry> = [
    {
        affectedFileIds: ["src/api/auth.ts", "src/api/login.ts"],
        deltaPercentage: 14,
        districtId: "src/api",
        districtLabel: "src/api",
        fileCount: 2,
        primaryFileId: "src/api/auth.ts",
        trend: "improving",
    },
    {
        affectedFileIds: ["src/worker/retry.ts"],
        deltaPercentage: -9,
        districtId: "src/worker",
        districtLabel: "src/worker",
        fileCount: 1,
        primaryFileId: "src/worker/retry.ts",
        trend: "degrading",
    },
]

describe("DistrictTrendIndicators", (): void => {
    it("рендерит district trends c green up / red down индикаторами", (): void => {
        renderWithProviders(<DistrictTrendIndicators entries={TEST_ENTRIES} />)

        expect(screen.getByText("District trend indicators")).not.toBeNull()
        expect(screen.getByLabelText("District trend indicators")).not.toBeNull()
        expect(screen.getByText("Improving")).not.toBeNull()
        expect(screen.getByText("Degrading")).not.toBeNull()
        expect(screen.getByText("2 files · 14% better")).not.toBeNull()
        expect(screen.getByText("1 files · 9% worse")).not.toBeNull()
    })

    it("вызывает onSelectEntry при выборе district", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectEntry = vi.fn()
        renderWithProviders(
            <DistrictTrendIndicators entries={TEST_ENTRIES} onSelectEntry={onSelectEntry} />,
        )

        await user.click(screen.getByRole("button", { name: "Inspect district trend src/api" }))

        expect(onSelectEntry).toHaveBeenCalledTimes(1)
        expect(onSelectEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                districtId: "src/api",
                primaryFileId: "src/api/auth.ts",
                trend: "improving",
            }),
        )
    })
})
