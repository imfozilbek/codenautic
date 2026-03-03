import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
    PackageDependencyGraph,
    buildPackageDependencyGraphData,
} from "@/components/graphs/package-dependency-graph"

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

describe("package dependency graph", (): void => {
    it("builds graph data and deduplicates duplicate package relations", (): void => {
        const nodes = [
            { id: "pkg-a", layer: "api", name: "pkg-a" },
            { id: "pkg-b", layer: "core", name: "pkg-b" },
            { id: "pkg-c", layer: "infra", name: "pkg-c" },
        ]
        const relations = [
            {
                relationType: "runtime",
                source: "pkg-a",
                target: "pkg-b",
            },
            {
                relationType: "runtime",
                source: "pkg-a",
                target: "pkg-b",
            },
            {
                relationType: "runtime",
                source: "pkg-b",
                target: "missing-package",
            },
        ]

        const graphData = buildPackageDependencyGraphData(nodes, relations)

        expect(graphData.nodes).toHaveLength(3)
        expect(graphData.edges).toHaveLength(1)
        expect(
            graphData.edges.some(
                (edge): boolean => edge.id === "pkg-a->pkg-b:runtime",
            ),
        ).toBe(true)
    })

    it("рендерит summary и fallback поисковый placeholder", (): void => {
        render(
            <PackageDependencyGraph
                nodes={[
                    {
                        id: "pkg-ui",
                        layer: "ui",
                        name: "pkg-ui",
                    },
                    {
                        id: "pkg-core",
                        layer: "core",
                        name: "pkg-core",
                    },
                ]}
                relations={[
                    {
                        relationType: "runtime",
                        source: "pkg-ui",
                        target: "pkg-core",
                    },
                ]}
                title="Package graph"
            />,
        )

        expect(screen.getByText("Package graph")).not.toBeNull()
        expect(screen.getByText("Nodes: 2, edges: 1")).not.toBeNull()
        expect(screen.getByTestId("xyflow-node-count")).toHaveTextContent("2")
        expect(screen.getByTestId("xyflow-edge-count")).toHaveTextContent("1")
        expect(screen.getByPlaceholderText("Filter packages by name")).not.toBeNull()
    })
})

