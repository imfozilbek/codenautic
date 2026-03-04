import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    FileDependencyGraph,
    buildFileDependencyGraphData,
} from "@/components/graphs/file-dependency-graph"

vi.mock("@/components/graphs/xyflow-graph", () => ({
    XyFlowGraph: ({
        ariaLabel,
        edges,
        nodes,
        onNodeSelect,
        selectedNodeId,
    }: {
        readonly ariaLabel?: string
        readonly edges: ReadonlyArray<unknown>
        readonly nodes: ReadonlyArray<unknown>
        readonly onNodeSelect?: (nodeId: string) => void
        readonly selectedNodeId?: string
    }): React.JSX.Element => {
        return (
            <div aria-label={ariaLabel}>
                <span data-testid="xyflow-node-count">{nodes.length}</span>
                <span data-testid="xyflow-edge-count">{edges.length}</span>
                <span data-testid="selected-node-id">{selectedNodeId ?? ""}</span>
                {nodes.map((node, index): React.JSX.Element => {
                    const nodeRecord = node as { readonly id?: unknown }
                    const nodeId = typeof nodeRecord.id === "string" ? nodeRecord.id : `node-${index}`
                    return (
                        <button
                            key={nodeId}
                            onClick={(): void => {
                                if (onNodeSelect !== undefined) {
                                    onNodeSelect(nodeId)
                                }
                            }}
                            type="button"
                        >
                            {`select-${nodeId}`}
                        </button>
                    )
                })}
            </div>
        )
    },
}))

describe("file dependency graph", (): void => {
    it("строит корректный layout-data и фильтрует невалидные зависимости", (): void => {
        const files = [
            { id: "src/index.ts", path: "src/index.ts" },
            { id: "src/api.ts", path: "src/api.ts" },
            { id: "src/util.ts", path: "src/util.ts" },
        ]
        const relations = [
            {
                relationType: "import",
                source: "src/index.ts",
                target: "src/api.ts",
            },
            {
                relationType: "import",
                source: "src/index.ts",
                target: "src/api.ts",
            },
            {
                relationType: "runtime",
                source: "src/index.ts",
                target: "src/util.ts",
            },
            {
                relationType: "import",
                source: "src/index.ts",
                target: "src/missing.ts",
            },
        ]

        const graphData = buildFileDependencyGraphData(files, relations)

        expect(graphData.nodes).toHaveLength(3)
        expect(graphData.edges).toHaveLength(2)
        expect(
            graphData.edges.some(
                (edge): boolean => edge.id === "src/index.ts->src/api.ts:import",
            ),
        ).toBe(true)
        expect(
            graphData.edges.some(
                (edge): boolean => edge.id === "src/index.ts->src/util.ts:runtime",
            ),
        ).toBe(true)
    })

    it("рендерит граф с корректным summary и fallback-контролами", (): void => {
        render(
            <FileDependencyGraph
                dependencies={[
                    {
                        relationType: "import",
                        source: "src/index.ts",
                        target: "src/api.ts",
                    },
                ]}
                files={[
                    { id: "src/index.ts", path: "src/index.ts" },
                    { id: "src/api.ts", path: "src/api.ts" },
                ]}
                title="Dependency graph"
            />,
        )

        expect(screen.getByText("Dependency graph")).not.toBeNull()
        expect(screen.getByText("Nodes: 2, edges: 1")).not.toBeNull()
        expect(screen.getByTestId("xyflow-node-count")).toHaveTextContent("2")
        expect(screen.getByTestId("xyflow-edge-count")).toHaveTextContent("1")
        expect(screen.getByPlaceholderText("Filter files by path")).not.toBeNull()
        expect(screen.getByText("Node details")).not.toBeNull()
        expect(screen.getByText("Select a node to inspect dependencies.")).not.toBeNull()
    })

    it("показывает детали выбранного узла", async (): Promise<void> => {
        const user = userEvent.setup()
        render(
            <FileDependencyGraph
                dependencies={[
                    {
                        relationType: "import",
                        source: "src/index.ts",
                        target: "src/api.ts",
                    },
                    {
                        relationType: "runtime",
                        source: "src/api.ts",
                        target: "src/index.ts",
                    },
                ]}
                files={[
                    { complexity: 8, churn: 3, id: "src/index.ts", path: "src/index.ts" },
                    { complexity: 5, churn: 1, id: "src/api.ts", path: "src/api.ts" },
                ]}
            />,
        )

        await user.click(screen.getByRole("button", { name: "select-src/index.ts" }))

        expect(screen.getByText("Path: src/index.ts")).not.toBeNull()
        expect(screen.getByText("Complexity: 8")).not.toBeNull()
        expect(screen.getByText("Churn: 3")).not.toBeNull()
        expect(screen.getByText("Incoming deps: 1")).not.toBeNull()
        expect(screen.getByText("Outgoing deps: 1")).not.toBeNull()
    })
})
