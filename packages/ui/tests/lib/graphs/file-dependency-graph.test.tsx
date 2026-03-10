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
                    const nodeId =
                        typeof nodeRecord.id === "string" ? nodeRecord.id : `node-${index}`
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
            graphData.edges.some((edge): boolean => edge.id === "src/index.ts->src/api.ts:import"),
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

    it("включает highlight impact paths для выбранного узла", async (): Promise<void> => {
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
                        relationType: "import",
                        source: "src/api.ts",
                        target: "src/util.ts",
                    },
                ]}
                files={[
                    { id: "src/index.ts", path: "src/index.ts" },
                    { id: "src/api.ts", path: "src/api.ts" },
                    { id: "src/util.ts", path: "src/util.ts" },
                ]}
            />,
        )

        await user.click(screen.getByRole("button", { name: "select-src/api.ts" }))
        await user.click(screen.getByRole("button", { name: "Highlight impact paths" }))

        expect(screen.getByTestId("highlighted-node-count")).toHaveTextContent("3")
        expect(screen.getByTestId("highlighted-edge-count")).toHaveTextContent("2")
    })

    it("when пустой files массив, then показывает empty state", (): void => {
        render(<FileDependencyGraph dependencies={[]} files={[]} />)

        expect(screen.getByText("No file dependencies yet.")).not.toBeNull()
    })

    it("when передан custom emptyStateLabel, then показывает его", (): void => {
        render(
            <FileDependencyGraph
                dependencies={[]}
                emptyStateLabel="Нет данных для отображения."
                files={[]}
            />,
        )

        expect(screen.getByText("Нет данных для отображения.")).not.toBeNull()
    })

    it("when фильтр по path применён, then отображаются только подходящие узлы", async (): Promise<void> => {
        const user = userEvent.setup()
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
                    { id: "lib/util.ts", path: "lib/util.ts" },
                ]}
            />,
        )

        const filterInput = screen.getByPlaceholderText("Filter files by path")
        await user.type(filterInput, "api")

        expect(screen.getByText("Nodes: 1, edges: 0")).not.toBeNull()
    })

    it("when фильтр применён и Reset нажат, then сбрасывает фильтр", async (): Promise<void> => {
        const user = userEvent.setup()
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
            />,
        )

        const filterInput = screen.getByPlaceholderText("Filter files by path")
        await user.type(filterInput, "api")
        expect(screen.getByText("Nodes: 1, edges: 0")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Reset" }))
        expect(screen.getByText("Nodes: 2, edges: 1")).not.toBeNull()
    })

    it("when тот же узел выбран повторно, then деселектится", async (): Promise<void> => {
        const user = userEvent.setup()
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
            />,
        )

        await user.click(screen.getByRole("button", { name: "select-src/index.ts" }))
        expect(screen.getByText("Path: src/index.ts")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "select-src/index.ts" }))
        expect(screen.getByText("Select a node to inspect dependencies.")).not.toBeNull()
    })

    it("when файл без complexity и churn, then показывает n/a", async (): Promise<void> => {
        const user = userEvent.setup()
        render(
            <FileDependencyGraph
                dependencies={[]}
                files={[{ id: "src/bare.ts", path: "src/bare.ts" }]}
            />,
        )

        await user.click(screen.getByRole("button", { name: "select-src/bare.ts" }))

        expect(screen.getByText("Complexity: n/a")).not.toBeNull()
        expect(screen.getByText("Churn: n/a")).not.toBeNull()
    })

    it("when relation без relationType, then edge id формируется с пустым суффиксом", (): void => {
        const files = [
            { id: "a.ts", path: "a.ts" },
            { id: "b.ts", path: "b.ts" },
        ]
        const relations = [{ source: "a.ts", target: "b.ts" }]

        const graphData = buildFileDependencyGraphData(files, relations)

        expect(graphData.edges).toHaveLength(1)
        expect(graphData.edges[0]?.id).toBe("a.ts->b.ts:")
    })

    it("when label длиннее MAX_LABEL_LENGTH, then обрезается с троеточием", (): void => {
        const longPath =
            "src/very/deeply/nested/directory/structure/that/exceeds/maximum/label/length/file.ts"
        const files = [{ id: longPath, path: longPath }]

        const graphData = buildFileDependencyGraphData(files, [])

        expect(graphData.nodes).toHaveLength(1)
        const nodeLabel = graphData.nodes[0]?.label ?? ""
        expect(nodeLabel.startsWith("…")).toBe(true)
        expect(nodeLabel.length).toBeLessThanOrEqual(42)
    })

    it("when Highlight impact paths нажат без выбранного узла, then disabled", (): void => {
        render(
            <FileDependencyGraph
                dependencies={[
                    {
                        relationType: "import",
                        source: "src/a.ts",
                        target: "src/b.ts",
                    },
                ]}
                files={[
                    { id: "src/a.ts", path: "src/a.ts" },
                    { id: "src/b.ts", path: "src/b.ts" },
                ]}
            />,
        )

        const highlightButton = screen.getByRole("button", {
            name: "Highlight impact paths",
        })
        expect(highlightButton).toHaveAttribute("disabled")
    })

    it("when фильтр не совпадает ни с одним файлом, then показывает empty state в теле графа", async (): Promise<void> => {
        const user = userEvent.setup()
        render(
            <FileDependencyGraph
                dependencies={[
                    {
                        relationType: "import",
                        source: "src/a.ts",
                        target: "src/b.ts",
                    },
                ]}
                files={[
                    { id: "src/a.ts", path: "src/a.ts" },
                    { id: "src/b.ts", path: "src/b.ts" },
                ]}
            />,
        )

        const filterInput = screen.getByPlaceholderText("Filter files by path")
        await user.type(filterInput, "zzz_no_match")

        expect(screen.getByText("Nodes: 0, edges: 0")).not.toBeNull()
    })
})
