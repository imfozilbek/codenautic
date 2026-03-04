import { render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { XyFlowGraph } from "@/components/graphs/xyflow-graph"
import type { IGraphEdge, IGraphNode } from "@/components/graphs/xyflow-graph-layout"

const { mockRenderer } = vi.hoisted(() => ({
    mockRenderer: vi.fn(
        (props: {
            readonly nodes: ReadonlyArray<IGraphNode>
            readonly edges: ReadonlyArray<IGraphEdge>
        }): React.JSX.Element => {
            return (
                <div aria-label="xyflow-renderer">
                    <span data-testid="renderer-nodes">{props.nodes.length}</span>
                    <span data-testid="renderer-edges">{props.edges.length}</span>
                </div>
            )
        },
    ),
}))

vi.mock("@/components/graphs/xyflow-graph-renderer", () => ({
    default: (props: {
        readonly nodes: ReadonlyArray<IGraphNode>
        readonly edges: ReadonlyArray<IGraphEdge>
    }): ReactNode => mockRenderer(props),
}))

function buildNodes(count: number): ReadonlyArray<IGraphNode> {
    return Array.from({ length: count }, (_value, index): IGraphNode => ({
        id: `node-${index}`,
        label: `Node ${index}`,
    }))
}

function buildChainEdges(count: number): ReadonlyArray<IGraphEdge> {
    const edges: IGraphEdge[] = []
    for (let index = 0; index < count - 1; index += 1) {
        edges.push({
            id: `edge-${index}`,
            source: `node-${index}`,
            target: `node-${index + 1}`,
        })
    }

    return edges
}

describe("XyFlowGraph", (): void => {
    afterEach((): void => {
        mockRenderer.mockClear()
        vi.useRealTimers()
    })

    it("рендерит полный граф, когда budget не превышен", async (): Promise<void> => {
        render(
            <XyFlowGraph
                ariaLabel="small graph"
                edges={buildChainEdges(3)}
                nodes={buildNodes(3)}
            />,
        )

        await waitFor((): void => {
            expect(mockRenderer).toHaveBeenCalled()
        })

        expect(screen.getByTestId("renderer-nodes")).toHaveTextContent("3")
        expect(screen.getByTestId("renderer-edges")).toHaveTextContent("2")
        expect(screen.queryByText("Rendering graph with scale budget...")).toBeNull()
    })

    it("показывает progressive rendering индикатор для крупного графа", async (): Promise<void> => {
        vi.useFakeTimers()
        render(
            <XyFlowGraph
                ariaLabel="progressive graph"
                edges={buildChainEdges(6)}
                nodes={buildNodes(6)}
                scaleBudget={{
                    maxEdges: 20,
                    maxNodes: 20,
                    progressiveThresholdEdges: 1,
                    progressiveThresholdNodes: 1,
                }}
            />,
        )

        expect(screen.getByText("Rendering graph with scale budget...")).not.toBeNull()
        expect(mockRenderer).toHaveBeenCalledTimes(0)

        vi.runAllTimers()

        await waitFor((): void => {
            expect(mockRenderer).toHaveBeenCalledTimes(1)
        })
    })

    it("применяет graph scale budget и показывает too large подсказку", async (): Promise<void> => {
        render(
            <XyFlowGraph
                ariaLabel="budget graph"
                edges={buildChainEdges(10)}
                nodes={buildNodes(10)}
                scaleBudget={{
                    maxEdges: 3,
                    maxNodes: 4,
                    maxTraversalDepth: 2,
                    progressiveThresholdEdges: 50,
                    progressiveThresholdNodes: 50,
                }}
            />,
        )

        await waitFor((): void => {
            expect(mockRenderer).toHaveBeenCalled()
        })

        const latestCall = mockRenderer.mock.calls.at(-1)?.[0] as
            | { readonly nodes: ReadonlyArray<IGraphNode>; readonly edges: ReadonlyArray<IGraphEdge> }
            | undefined
        expect(latestCall).not.toBeUndefined()
        expect((latestCall?.nodes.length ?? 0) <= 4).toBe(true)
        expect((latestCall?.edges.length ?? 0) <= 3).toBe(true)
        expect(screen.getByText(/Graph is too large/)).not.toBeNull()
        expect(screen.getByText(/Use filters, reduce depth, or wait for clustering/)).not.toBeNull()
    })
})
