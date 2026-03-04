import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    HotAreaHighlights,
    type IHotAreaHighlightDescriptor,
} from "@/components/graphs/hot-area-highlights"
import { renderWithProviders } from "../utils/render"

const TEST_HIGHLIGHTS: ReadonlyArray<IHotAreaHighlightDescriptor> = [
    {
        description: "Complexity 28 · Bugs (30d) 5",
        fileId: "src/api/repository.ts",
        label: "src/api/repository.ts",
        severity: "critical",
    },
    {
        description: "Complexity 19 · Bugs (30d) 3",
        fileId: "src/services/metrics.ts",
        label: "src/services/metrics.ts",
        severity: "high",
    },
]

describe("HotAreaHighlights", (): void => {
    it("рендерит pulsing зоны с лейблами и описаниями", (): void => {
        renderWithProviders(<HotAreaHighlights highlights={TEST_HIGHLIGHTS} onFocusHotArea={vi.fn()} />)

        expect(screen.getByText("Hot area highlights")).not.toBeNull()
        expect(screen.getByText("src/api/repository.ts")).not.toBeNull()
        expect(screen.getByText("Complexity 28 · Bugs (30d) 5")).not.toBeNull()
        expect(screen.getByText("critical")).not.toBeNull()
    })

    it("вызывает callback при фокусе hot area", async (): Promise<void> => {
        const user = userEvent.setup()
        const onFocusHotArea = vi.fn()
        renderWithProviders(
            <HotAreaHighlights highlights={TEST_HIGHLIGHTS} onFocusHotArea={onFocusHotArea} />,
        )

        await user.click(screen.getByRole("button", { name: "Focus hot area src/api/repository.ts" }))
        expect(onFocusHotArea).toHaveBeenCalledTimes(1)
        expect(onFocusHotArea).toHaveBeenCalledWith(
            expect.objectContaining({
                fileId: "src/api/repository.ts",
            }),
        )
    })
})
