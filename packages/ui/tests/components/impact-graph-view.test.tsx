import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ImpactGraphView,
    type IImpactGraphEdge,
    type IImpactGraphNode,
} from "@/components/graphs/impact-graph-view"
import { renderWithProviders } from "../utils/render"

const TEST_NODES: ReadonlyArray<IImpactGraphNode> = [
    {
        depth: 0,
        id: "src/services/retry.ts",
        impactScore: 82,
        label: "src/services/retry.ts",
    },
    {
        depth: 1,
        id: "src/queue/worker.ts",
        impactScore: 64,
        label: "src/queue/worker.ts",
    },
]

const TEST_EDGES: ReadonlyArray<IImpactGraphEdge> = [
    {
        id: "edge-1",
        sourceId: "src/services/retry.ts",
        targetId: "src/queue/worker.ts",
    },
]

describe("ImpactGraphView", (): void => {
    it("рендерит propagation graph и поддерживает collapse node", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ImpactGraphView edges={TEST_EDGES} nodes={TEST_NODES} />)

        expect(screen.getByText("Impact graph view")).not.toBeNull()
        expect(screen.getByText("src/services/retry.ts → src/queue/worker.ts")).not.toBeNull()
        expect(screen.getByText("src/queue/worker.ts")).not.toBeNull()

        await user.click(
            screen.getByRole("button", {
                name: "Toggle impact node src/services/retry.ts",
            }),
        )
        expect(screen.queryByText("src/queue/worker.ts")).toBeNull()
    })

    it("вызывает callback при выборе узла", async (): Promise<void> => {
        const user = userEvent.setup()
        const onFocusNode = vi.fn()
        renderWithProviders(<ImpactGraphView edges={TEST_EDGES} nodes={TEST_NODES} onFocusNode={onFocusNode} />)

        await user.click(
            screen.getByRole("button", {
                name: "Inspect impact node src/services/retry.ts",
            }),
        )

        expect(onFocusNode).toHaveBeenCalledTimes(1)
        expect(onFocusNode).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "src/services/retry.ts",
            }),
        )
    })
})
