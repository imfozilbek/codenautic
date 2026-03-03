import { render, screen } from "@testing-library/react"
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
    }: {
        readonly ariaLabel?: string
        readonly edges: ReadonlyArray<unknown>
        readonly nodes: ReadonlyArray<unknown>
    }): React.JSX.Element => {
        return (
            <div aria-label={ariaLabel}>
                <span data-testid="xyflow-node-count">{nodes.length}</span>
                <span data-testid="xyflow-edge-count">{edges.length}</span>
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
    })
})
