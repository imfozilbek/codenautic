import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    CityImpactOverlay,
    type ICityImpactOverlayEntry,
} from "@/components/graphs/city-impact-overlay"
import { renderWithProviders } from "../utils/render"

const TEST_ENTRIES: ReadonlyArray<ICityImpactOverlayEntry> = [
    {
        details: "Affects retry pipeline and scheduler consumer",
        fileId: "src/services/retry.ts",
        intensity: 86,
        label: "src/services/retry.ts",
    },
    {
        details: "Touches worker queues and delivery flow",
        fileId: "src/queue/worker.ts",
        intensity: 58,
        label: "src/queue/worker.ts",
    },
]

describe("CityImpactOverlay", (): void => {
    it("рендерит ripple entries с интенсивностью impact", (): void => {
        renderWithProviders(<CityImpactOverlay entries={TEST_ENTRIES} />)

        expect(screen.getByText("City impact overlay")).not.toBeNull()
        expect(screen.getByText("src/services/retry.ts")).not.toBeNull()
        expect(screen.getByText("Affects retry pipeline and scheduler consumer")).not.toBeNull()
        expect(screen.getByText("86%")).not.toBeNull()
    })

    it("вызывает callback при выборе impact entry", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectEntry = vi.fn()
        renderWithProviders(<CityImpactOverlay entries={TEST_ENTRIES} onSelectEntry={onSelectEntry} />)

        await user.click(
            screen.getByRole("button", { name: "Inspect city impact src/services/retry.ts" }),
        )

        expect(onSelectEntry).toHaveBeenCalledTimes(1)
        expect(onSelectEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                fileId: "src/services/retry.ts",
                intensity: 86,
            }),
        )
    })
})
