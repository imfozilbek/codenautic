import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ImpactAnalysisPanel,
    type IImpactAnalysisSeed,
} from "@/components/predictions/impact-analysis-panel"
import { renderWithProviders } from "../../utils/render"

const MOCK_SEEDS: ReadonlyArray<IImpactAnalysisSeed> = [
    {
        id: "seed-1",
        fileId: "file-api",
        label: "api/routes.ts",
        affectedFiles: ["cache/store.ts", "db/queries.ts"],
        affectedTests: ["routes.test.ts"],
        affectedConsumers: ["web-app"],
        riskScore: 80,
    },
    {
        id: "seed-2",
        fileId: "file-util",
        label: "utils/helpers.ts",
        affectedFiles: ["api/routes.ts"],
        affectedTests: ["helpers.test.ts"],
        affectedConsumers: [],
        riskScore: 30,
    },
]

describe("ImpactAnalysisPanel", (): void => {
    it("when rendered with seeds, then displays title and seed labels", (): void => {
        renderWithProviders(<ImpactAnalysisPanel seeds={MOCK_SEEDS} />)

        expect(screen.getByText("Impact analysis panel")).not.toBeNull()
        expect(screen.getByText("api/routes.ts")).not.toBeNull()
        expect(screen.getByText("utils/helpers.ts")).not.toBeNull()
    })

    it("when no seeds are selected, then risk score shows 0", (): void => {
        renderWithProviders(<ImpactAnalysisPanel seeds={MOCK_SEEDS} />)

        expect(screen.getByText("0")).not.toBeNull()
    })

    it("when seed checkbox is checked, then updates aggregated risk score", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<ImpactAnalysisPanel seeds={MOCK_SEEDS} />)

        const checkbox = screen.getByRole("checkbox", {
            name: /Select impact file api\/routes.ts/,
        })
        await user.click(checkbox)

        expect(screen.getByText("80")).not.toBeNull()
    })

    it("when no seeds selected, then apply button is disabled", (): void => {
        renderWithProviders(<ImpactAnalysisPanel seeds={MOCK_SEEDS} />)

        const button = screen.getByRole("button", { name: "Apply impact focus" })
        expect(button).toBeDisabled()
    })

    it("when seed is selected and apply clicked, then calls onApplyImpact", async (): Promise<void> => {
        const user = userEvent.setup()
        const onApply = vi.fn()

        renderWithProviders(<ImpactAnalysisPanel seeds={MOCK_SEEDS} onApplyImpact={onApply} />)

        const checkbox = screen.getByRole("checkbox", {
            name: /Select impact file api\/routes.ts/,
        })
        await user.click(checkbox)

        const button = screen.getByRole("button", { name: "Apply impact focus" })
        await user.click(button)

        expect(onApply).toHaveBeenCalledWith(
            expect.objectContaining({
                fileId: "file-api",
                riskScore: 80,
            }),
        )
    })
})
