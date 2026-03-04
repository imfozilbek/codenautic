import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
    type IPackageDependencyNode,
    PackageDependencyGraph,
    buildPackageDependencyGraphData,
} from "@/components/graphs/package-dependency-graph"

const { mockExportGraphAsJson } = vi.hoisted(() => ({
    mockExportGraphAsJson: vi.fn((): void => {}),
}))

vi.mock("@/components/graphs/graph-export", () => ({
    exportGraphAsJson: mockExportGraphAsJson,
}))

vi.mock("@/components/graphs/xyflow-graph", () => ({
    XyFlowGraph: ({
        ariaLabel,
        edges,
        nodes,
        highlightedEdgeIds,
        highlightedNodeIds,
        onNodeSelect,
        selectedNodeId,
    }: {
        readonly ariaLabel?: string
        readonly edges: ReadonlyArray<unknown>
        readonly nodes: ReadonlyArray<unknown>
        readonly highlightedNodeIds?: ReadonlyArray<string>
        readonly highlightedEdgeIds?: ReadonlyArray<string>
        readonly onNodeSelect?: (nodeId: string) => void
        readonly selectedNodeId?: string
    }): React.JSX.Element => {
        return (
            <div aria-label={ariaLabel}>
                <span data-testid="xyflow-node-count">{nodes.length}</span>
                <span data-testid="xyflow-edge-count">{edges.length}</span>
                <span data-testid="selected-node-id">{selectedNodeId ?? ""}</span>
                <span data-testid="highlighted-node-count">{highlightedNodeIds?.length ?? 0}</span>
                <span data-testid="highlighted-edge-count">{highlightedEdgeIds?.length ?? 0}</span>
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

describe("package dependency graph", (): void => {
    beforeEach((): void => {
        if (typeof globalThis.localStorage !== "undefined") {
            globalThis.localStorage.clear()
        }
        mockExportGraphAsJson.mockClear()
    })

    afterEach((): void => {
        vi.useRealTimers()
    })

    it("builds graph data and deduplicates duplicate package relations", (): void => {
        const nodes = [
            { id: "pkg-a", layer: "api", name: "pkg-a" },
            { id: "pkg-b", layer: "core", name: "pkg-b" },
            { id: "pkg-c", layer: "infra", name: "pkg-c" },
        ] as const
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
        expect(screen.getByText("Node details")).not.toBeNull()
        expect(screen.getByText("Select a node to inspect package relationships.")).not.toBeNull()
    })

    it("фильтрует граф по типу связи", async (): Promise<void> => {
        const user = userEvent.setup()
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
                    {
                        id: "pkg-shared",
                        layer: "infra",
                        name: "pkg-shared",
                    },
                ]}
                relations={[
                    {
                        relationType: "runtime",
                        source: "pkg-ui",
                        target: "pkg-core",
                    },
                    {
                        relationType: "peer",
                        source: "pkg-ui",
                        target: "pkg-shared",
                    },
                ]}
                title="Package graph"
            />,
        )

        expect(screen.getByTestId("xyflow-edge-count")).toHaveTextContent("2")

        const peerFilter = screen.getByRole("button", { name: "peer" })
        await user.click(peerFilter)
        expect(screen.getByTestId("xyflow-edge-count")).toHaveTextContent("1")

        const clearFiltersButton = screen.getByRole("button", { name: "Clear relation filters" })
        await user.click(clearFiltersButton)
        expect(screen.getByTestId("xyflow-edge-count")).toHaveTextContent("2")
    })

    it("показывает детали выбранного package node", async (): Promise<void> => {
        const user = userEvent.setup()
        render(
            <PackageDependencyGraph
                nodes={[
                    {
                        id: "pkg-ui",
                        layer: "ui",
                        name: "pkg-ui",
                        size: 16,
                    },
                    {
                        id: "pkg-core",
                        layer: "core",
                        name: "pkg-core",
                        size: 20,
                    },
                ]}
                relations={[
                    {
                        relationType: "runtime",
                        source: "pkg-ui",
                        target: "pkg-core",
                    },
                    {
                        relationType: "peer",
                        source: "pkg-core",
                        target: "pkg-ui",
                    },
                ]}
            />,
        )

        await user.click(screen.getByRole("button", { name: "select-pkg-ui" }))

        expect(screen.getByText("Name: pkg-ui")).not.toBeNull()
        expect(screen.getByText("Layer: ui")).not.toBeNull()
        expect(screen.getByText("Size: 16")).not.toBeNull()
        expect(screen.getByText("Incoming relations: 1")).not.toBeNull()
        expect(screen.getByText("Outgoing relations: 1")).not.toBeNull()
    })

    it("включает highlight impact paths для package graph", async (): Promise<void> => {
        const user = userEvent.setup()
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
                    {
                        id: "pkg-shared",
                        layer: "infra",
                        name: "pkg-shared",
                    },
                ]}
                relations={[
                    {
                        relationType: "runtime",
                        source: "pkg-ui",
                        target: "pkg-core",
                    },
                    {
                        relationType: "runtime",
                        source: "pkg-core",
                        target: "pkg-shared",
                    },
                ]}
            />,
        )

        await user.click(screen.getByRole("button", { name: "select-pkg-core" }))
        await user.click(screen.getByRole("button", { name: "Highlight impact paths" }))

        expect(screen.getByTestId("highlighted-node-count")).toHaveTextContent("3")
        expect(screen.getByTestId("highlighted-edge-count")).toHaveTextContent("2")
    })

    it("переключает clustered view и LOD details для крупных графов", async (): Promise<void> => {
        const user = userEvent.setup()
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
                    {
                        id: "pkg-worker",
                        layer: "worker",
                        name: "pkg-worker",
                    },
                ]}
                relations={[
                    {
                        relationType: "runtime",
                        source: "pkg-ui",
                        target: "pkg-core",
                    },
                    {
                        relationType: "runtime",
                        source: "pkg-core",
                        target: "pkg-worker",
                    },
                ]}
            />,
        )

        expect(screen.getByTestId("xyflow-node-count")).toHaveTextContent("3")
        await user.click(screen.getByRole("button", { name: "Switch to clustered view" }))
        expect(screen.getByTestId("xyflow-node-count")).toHaveTextContent("3")

        await user.click(screen.getByRole("button", { name: "LOD: overview" }))
        expect(screen.getByText("Loading cluster details...")).not.toBeNull()
        expect(await screen.findByRole("button", { name: "LOD: details" })).not.toBeNull()
    })

    it("применяет focus path режим к выбранному узлу", async (): Promise<void> => {
        const user = userEvent.setup()
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
                    {
                        id: "pkg-db",
                        layer: "db",
                        name: "pkg-db",
                    },
                ]}
                relations={[
                    {
                        relationType: "runtime",
                        source: "pkg-ui",
                        target: "pkg-core",
                    },
                ]}
            />,
        )

        expect(screen.getByTestId("xyflow-node-count")).toHaveTextContent("3")
        await user.click(screen.getByRole("button", { name: "select-pkg-ui" }))
        await user.click(screen.getByRole("button", { name: "Focus path" }))

        expect(screen.getByTestId("xyflow-node-count")).toHaveTextContent("2")
    })

    it("показывает huge graph fallback и экспортирует aggregated json", async (): Promise<void> => {
        const user = userEvent.setup()
        const nodes: ReadonlyArray<IPackageDependencyNode> = Array.from(
            { length: 270 },
            (_item, index): IPackageDependencyNode => ({
            id: `pkg-${index}`,
            layer: (index % 3 === 0 ? "core" : index % 3 === 1 ? "api" : "ui"),
            name: `pkg-${index}`,
            }),
        )
        const relations = Array.from({ length: 269 }, (_item, index) => ({
            relationType: "runtime",
            source: `pkg-${index}`,
            target: `pkg-${index + 1}`,
        }))

        render(
            <PackageDependencyGraph
                nodes={nodes}
                relations={relations}
                title="Huge graph"
            />,
        )

        expect(screen.getByText(/Graph is too large for full render/)).not.toBeNull()
        await user.click(screen.getByRole("button", { name: "Export fallback JSON" }))
        expect(mockExportGraphAsJson).toHaveBeenCalledTimes(1)
    })
})
