import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    KnowledgeSiloPanel,
    type IKnowledgeSiloPanelEntry,
} from "@/components/graphs/knowledge-silo-panel"
import { renderWithProviders } from "../utils/render"

const TEST_ENTRIES: ReadonlyArray<IKnowledgeSiloPanelEntry> = [
    {
        contributorCount: 1,
        fileCount: 3,
        fileIds: ["src/api/auth.ts", "src/api/repository.ts", "src/api/router.ts"],
        primaryFileId: "src/api/auth.ts",
        riskScore: 82,
        siloId: "src/api",
        siloLabel: "src/api",
    },
    {
        contributorCount: 2,
        fileCount: 2,
        fileIds: ["src/worker/retry.ts", "src/worker/main.ts"],
        primaryFileId: "src/worker/retry.ts",
        riskScore: 55,
        siloId: "src/worker",
        siloLabel: "src/worker",
    },
]

describe("KnowledgeSiloPanel", (): void => {
    it("рендерит список silos с risk score", (): void => {
        renderWithProviders(<KnowledgeSiloPanel entries={TEST_ENTRIES} />)

        expect(screen.getByText("Knowledge silo panel")).not.toBeNull()
        expect(screen.getByLabelText("Knowledge silos")).not.toBeNull()
        expect(screen.getByText("src/api")).not.toBeNull()
        expect(screen.getByText("Contributors: 1 · Files: 3")).not.toBeNull()
        expect(screen.getByText("Risk 82")).not.toBeNull()
    })

    it("вызывает onSelectEntry при выборе silo", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectEntry = vi.fn()
        renderWithProviders(<KnowledgeSiloPanel entries={TEST_ENTRIES} onSelectEntry={onSelectEntry} />)

        await user.click(
            screen.getByRole("button", { name: "Inspect knowledge silo src/api" }),
        )

        expect(onSelectEntry).toHaveBeenCalledTimes(1)
        expect(onSelectEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                primaryFileId: "src/api/auth.ts",
                riskScore: 82,
            }),
        )
    })
})
