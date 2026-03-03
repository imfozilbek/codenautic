import { render, screen } from "@testing-library/react"
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
    })
})

