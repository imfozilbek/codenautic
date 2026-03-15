import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { WhatIfPanel, type IWhatIfOption } from "@/components/predictions/what-if-panel"
import { renderWithProviders } from "../../utils/render"

const MOCK_OPTIONS: ReadonlyArray<IWhatIfOption> = [
    {
        id: "opt-1",
        fileId: "file-api",
        label: "api/routes.ts",
        impactScore: 85,
        affectedCount: 12,
    },
    {
        id: "opt-2",
        fileId: "file-cache",
        label: "cache/store.ts",
        impactScore: 40,
        affectedCount: 5,
    },
    {
        id: "opt-3",
        fileId: "file-util",
        label: "utils/format.ts",
        impactScore: 20,
        affectedCount: 2,
    },
]

describe("WhatIfPanel", (): void => {
    it("when rendered with options, then displays title and option labels", (): void => {
        renderWithProviders(<WhatIfPanel options={MOCK_OPTIONS} />)

        expect(screen.getByText("What-if panel")).not.toBeNull()
        expect(screen.getByText("api/routes.ts")).not.toBeNull()
        expect(screen.getByText("cache/store.ts")).not.toBeNull()
        expect(screen.getByText("utils/format.ts")).not.toBeNull()
    })

    it("when no options selected, then run button is disabled", (): void => {
        renderWithProviders(<WhatIfPanel options={MOCK_OPTIONS} />)

        const button = screen.getByRole("button", { name: "Run what-if scenario" })
        expect(button).toBeDisabled()
    })

    it("when option checkbox is checked and run clicked, then calls onRunScenario", async (): Promise<void> => {
        const user = userEvent.setup()
        const onRun = vi.fn()

        renderWithProviders(<WhatIfPanel options={MOCK_OPTIONS} onRunScenario={onRun} />)

        const checkbox = screen.getByRole("checkbox", {
            name: /Select what-if option api\/routes.ts/,
        })
        await user.click(checkbox)

        const button = screen.getByRole("button", { name: "Run what-if scenario" })
        await user.click(button)

        expect(onRun).toHaveBeenCalledWith(
            expect.objectContaining({
                fileIds: ["file-api"],
                aggregatedScore: 85,
                totalAffectedCount: 12,
            }),
        )
    })

    it("when multiple options selected, then aggregates score and affected count", async (): Promise<void> => {
        const user = userEvent.setup()
        const onRun = vi.fn()

        renderWithProviders(<WhatIfPanel options={MOCK_OPTIONS} onRunScenario={onRun} />)

        const firstCheckbox = screen.getByRole("checkbox", {
            name: /Select what-if option api\/routes.ts/,
        })
        const secondCheckbox = screen.getByRole("checkbox", {
            name: /Select what-if option cache\/store.ts/,
        })
        await user.click(firstCheckbox)
        await user.click(secondCheckbox)

        const button = screen.getByRole("button", { name: "Run what-if scenario" })
        await user.click(button)

        expect(onRun).toHaveBeenCalledWith(
            expect.objectContaining({
                fileIds: ["file-api", "file-cache"],
                aggregatedScore: 63,
                totalAffectedCount: 17,
            }),
        )
    })

    it("when option is checked then unchecked, then removes from selection", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<WhatIfPanel options={MOCK_OPTIONS} />)

        const checkbox = screen.getByRole("checkbox", {
            name: /Select what-if option api\/routes.ts/,
        })
        await user.click(checkbox)
        await user.click(checkbox)

        const button = screen.getByRole("button", { name: "Run what-if scenario" })
        expect(button).toBeDisabled()
    })
})
