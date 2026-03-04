import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import type { IGraphEdge, IGraphNode } from "@/components/graphs/xyflow-graph-layout"
import { XYFlowGraphRenderer } from "@/components/graphs/xyflow-graph-renderer"
import { exportGraphAsPng, exportGraphAsSvg } from "@/components/graphs/graph-export"

vi.mock("@/components/graphs/graph-export", () => ({
    exportGraphAsPng: vi.fn(async (): Promise<void> => {}),
    exportGraphAsSvg: vi.fn(() => {}),
}))

const mockUseReactFlow = vi.fn(() => {
    const getViewport = vi.fn((): { x: number; y: number; zoom: number } => ({ x: 0, y: 0, zoom: 1 }))

    return {
        fitView: vi.fn(async (): Promise<void> => {}),
        getViewport,
        moveViewport: vi.fn(),
        setViewport: vi.fn(async (): Promise<void> => {}),
        zoomIn: vi.fn(),
        zoomOut: vi.fn(),
    }
})

vi.mock("@xyflow/react", () => ({
    Background: (): ReactNode => <div aria-label="background" />,
    Controls: (): ReactNode => <div />,
    MiniMap: (): ReactNode => <div />,
    Panel: ({
        children,
    }: {
        readonly children?: ReactNode
    }): ReactNode => <div>{children}</div>,
    ReactFlow: ({
        children,
    }: {
        readonly children?: ReactNode
    }): ReactNode => <section>{children}</section>,
    useReactFlow: mockUseReactFlow,
}))

describe("XYFlowGraphRenderer", (): void => {
    it("показывает кнопки экспорта для непустого графа и блокирует их для пустого", (): void => {
        const nodes: IGraphNode[] = []
        const edges: IGraphEdge[] = []

        const { unmount } = render(
            <XYFlowGraphRenderer
                ariaLabel="empty graph"
                graphTitle="Empty graph"
                height="320px"
                edges={edges}
                nodes={nodes}
            />,
        )

        expect(screen.getByRole("button", { name: "Export graph as SVG" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Export graph as PNG" })).toBeDisabled()

        unmount()

        render(
            <XYFlowGraphRenderer
                ariaLabel="filled graph"
                graphTitle="Dependency graph"
                height="320px"
                edges={[{ source: "a", target: "b", id: "e1" }]}
                nodes={[
                    { id: "a", label: "A", width: 160, height: 60 },
                    { id: "b", label: "B", width: 160, height: 60 },
                ]}
            />,
        )

        expect(screen.getByRole("button", { name: "Export graph as SVG" })).toBeEnabled()
        expect(screen.getByRole("button", { name: "Export graph as PNG" })).toBeEnabled()
    })

    it("вызывает экспорт SVG/PNG с переданным заголовком графа", async (): Promise<void> => {
        const user = userEvent.setup()
        const nodes: IGraphNode[] = [{ id: "a", label: "A", width: 160, height: 60 }]

        render(
            <XYFlowGraphRenderer
                ariaLabel="single node graph"
                graphTitle="Calls"
                height="320px"
                edges={[]}
                nodes={nodes}
            />,
        )

        await user.click(screen.getByRole("button", { name: "Export graph as SVG" }))
        await user.click(screen.getByRole("button", { name: "Export graph as PNG" }))

        expect(exportGraphAsSvg).toHaveBeenCalledTimes(1)
        expect(exportGraphAsSvg).toHaveBeenCalledWith(
            "Calls",
            expect.arrayContaining([
                expect.objectContaining({
                    id: "a",
                }),
            ]),
            expect.any(Array),
        )
        expect(exportGraphAsPng).toHaveBeenCalledTimes(1)
        expect(exportGraphAsPng).toHaveBeenCalledWith(
            "Calls",
            expect.arrayContaining([
                expect.objectContaining({
                    id: "a",
                }),
            ]),
            expect.any(Array),
        )
    })
})
