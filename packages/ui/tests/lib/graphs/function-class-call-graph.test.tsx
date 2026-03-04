import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    FunctionClassCallGraph,
    buildFunctionCallGraphData,
} from "@/components/graphs/function-class-call-graph"

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

describe("function/class call graph", (): void => {
    it("строит корректный graph data и фильтрует невалидные вызовы", (): void => {
        const nodes = [
            {
                file: "src/auth.ts",
                id: "authController.login",
                kind: "function",
                name: "authController.login",
            },
            {
                file: "src/session.ts",
                id: "sessionService.createSession",
                kind: "function",
                name: "sessionService.createSession",
            },
            {
                file: "src/repo.ts",
                id: "repoService.fetchRepository",
                kind: "function",
                name: "repoService.fetchRepository",
            },
        ]
        const relations = [
            {
                relationType: "calls",
                source: "authController.login",
                target: "sessionService.createSession",
            },
            {
                relationType: "calls",
                source: "authController.login",
                target: "sessionService.createSession",
            },
            {
                relationType: "runtime",
                source: "repoService.fetchRepository",
                target: "missing.target",
            },
        ]

        const graphData = buildFunctionCallGraphData(nodes, relations)

        expect(graphData.nodes).toHaveLength(3)
        expect(graphData.edges).toHaveLength(1)
        expect(
            graphData.edges.some(
                (edge): boolean => edge.id === "authController.login->sessionService.createSession:calls",
            ),
        ).toBe(true)
    })

    it("рендерит граф с корректным summary и фильтром", (): void => {
        render(
            <FunctionClassCallGraph
                callRelations={[
                    {
                        relationType: "calls",
                        source: "worker.run",
                        target: "queueManager.poll",
                    },
                    {
                        relationType: "uses",
                        source: "PaymentWorker.start",
                        target: "worker.run",
                    },
                ]}
                nodes={[
                    {
                        id: "worker.run",
                        kind: "function",
                        name: "worker.run",
                    },
                    {
                        id: "PaymentWorker.start",
                        kind: "function",
                        name: "PaymentWorker.start",
                    },
                    {
                        id: "queueManager.poll",
                        kind: "function",
                        name: "queueManager.poll",
                    },
                ]}
                title="Calls"
            />,
        )

        expect(screen.getByText("Calls")).not.toBeNull()
        expect(screen.getByText("Nodes: 3, edges: 2")).not.toBeNull()
        expect(screen.getByTestId("xyflow-node-count")).toHaveTextContent("3")
        expect(screen.getByTestId("xyflow-edge-count")).toHaveTextContent("2")
        expect(screen.getByPlaceholderText("Filter by function or class")).not.toBeNull()
        expect(screen.getByText("Node details")).not.toBeNull()
        expect(screen.getByText("Select a node to inspect call relationships.")).not.toBeNull()
    })

    it("показывает детали выбранной функции", async (): Promise<void> => {
        const user = userEvent.setup()
        render(
            <FunctionClassCallGraph
                callRelations={[
                    {
                        relationType: "calls",
                        source: "worker.run",
                        target: "queueManager.poll",
                    },
                    {
                        relationType: "calls",
                        source: "queueManager.poll",
                        target: "worker.run",
                    },
                ]}
                nodes={[
                    {
                        complexity: 4,
                        file: "src/worker.ts",
                        id: "worker.run",
                        kind: "function",
                        name: "worker.run",
                    },
                    {
                        id: "queueManager.poll",
                        kind: "method",
                        name: "queueManager.poll",
                    },
                ]}
            />,
        )

        await user.click(screen.getByRole("button", { name: "select-worker.run" }))

        expect(screen.getByText("Name: worker.run")).not.toBeNull()
        expect(screen.getByText("Kind: function")).not.toBeNull()
        expect(screen.getByText("Source file: src/worker.ts")).not.toBeNull()
        expect(screen.getByText("Complexity: 4")).not.toBeNull()
        expect(screen.getByText("Incoming calls: 1")).not.toBeNull()
        expect(screen.getByText("Outgoing calls: 1")).not.toBeNull()
    })

    it("включает highlight impact paths для call graph", async (): Promise<void> => {
        const user = userEvent.setup()
        render(
            <FunctionClassCallGraph
                callRelations={[
                    {
                        relationType: "calls",
                        source: "a",
                        target: "b",
                    },
                    {
                        relationType: "calls",
                        source: "b",
                        target: "c",
                    },
                ]}
                nodes={[
                    { id: "a", kind: "function", name: "a" },
                    { id: "b", kind: "function", name: "b" },
                    { id: "c", kind: "function", name: "c" },
                ]}
            />,
        )

        await user.click(screen.getByRole("button", { name: "select-b" }))
        await user.click(screen.getByRole("button", { name: "Highlight impact paths" }))

        expect(screen.getByTestId("highlighted-node-count")).toHaveTextContent("3")
        expect(screen.getByTestId("highlighted-edge-count")).toHaveTextContent("2")
    })
})
