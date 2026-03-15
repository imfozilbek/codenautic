import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { VisualizationSection } from "@/pages/code-city-dashboard/sections/visualization-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockCodeCityState } from "./mock-code-city-state"

const { mockCodeCityTreemap } = vi.hoisted(() => ({
    mockCodeCityTreemap: vi.fn(
        (props: {
            readonly files: ReadonlyArray<unknown>
            readonly title: string
            readonly highlightedFileId?: string
        }): React.JSX.Element => (
            <div>
                <p>{props.title}</p>
                <p>treemap-files:{props.files.length}</p>
                <p>treemap-highlighted:{props.highlightedFileId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockPackageDependencyGraph } = vi.hoisted(() => ({
    mockPackageDependencyGraph: vi.fn(
        (props: {
            readonly nodes: ReadonlyArray<unknown>
            readonly relations: ReadonlyArray<unknown>
            readonly title?: string
        }): React.JSX.Element => (
            <div>
                <p>{props.title ?? "no-title"}</p>
                <p>dep-nodes:{props.nodes.length}</p>
                <p>dep-relations:{props.relations.length}</p>
            </div>
        ),
    ),
}))
const { mockCodeCity3DScene } = vi.hoisted(() => ({
    mockCodeCity3DScene: vi.fn(
        (props: {
            readonly title: string
            readonly files: ReadonlyArray<unknown>
        }): React.JSX.Element => (
            <div>
                <p>{props.title}</p>
                <p>3d-files:{props.files.length}</p>
            </div>
        ),
    ),
}))
const { mockChurnComplexityScatter } = vi.hoisted(() => ({
    mockChurnComplexityScatter: vi.fn(
        (props: {
            readonly files: ReadonlyArray<unknown>
            readonly selectedFileId?: string
        }): React.JSX.Element => (
            <div>
                <p>scatter-files:{props.files.length}</p>
                <p>scatter-selected:{props.selectedFileId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockHealthTrendChart } = vi.hoisted(() => ({
    mockHealthTrendChart: vi.fn(
        (props: { readonly points: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>health-points:{props.points.length}</p>
        ),
    ),
}))
const { mockRootCauseChainViewer } = vi.hoisted(() => ({
    mockRootCauseChainViewer: vi.fn(
        (props: { readonly issues: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>root-cause-issues:{props.issues.length}</p>
        ),
    ),
}))

vi.mock("@/components/codecity/codecity-treemap", () => ({
    CodeCityTreemap: mockCodeCityTreemap,
}))
vi.mock("@/components/dependency-graphs/package-dependency-graph", () => ({
    PackageDependencyGraph: mockPackageDependencyGraph,
}))
vi.mock("@/components/codecity/codecity-3d-scene", () => ({
    CodeCity3DScene: mockCodeCity3DScene,
}))
vi.mock("@/components/codecity/churn-complexity-scatter", () => ({
    ChurnComplexityScatter: mockChurnComplexityScatter,
}))
vi.mock("@/components/codecity/health-trend-chart", () => ({
    HealthTrendChart: mockHealthTrendChart,
}))
vi.mock("@/components/codecity/root-cause-chain-viewer", () => ({
    RootCauseChainViewer: mockRootCauseChainViewer,
}))

describe("VisualizationSection", (): void => {
    it("when rendered, then shows package dependency graph and 3D scene", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<VisualizationSection state={state} />)

        expect(screen.getByText(/dep-nodes:/)).not.toBeNull()
        expect(screen.getByText("3d-files:1")).not.toBeNull()
    })

    it("when rendered, then shows scatter, health trend and root cause viewer", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<VisualizationSection state={state} />)

        expect(screen.getByText("scatter-files:1")).not.toBeNull()
        expect(screen.getByText("health-points:1")).not.toBeNull()
        expect(screen.getByText("root-cause-issues:0")).not.toBeNull()
    })

    it("when rendered, then shows treemap with profile files", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<VisualizationSection state={state} />)

        expect(screen.getByText("treemap-files:1")).not.toBeNull()
        expect(screen.getByText("treemap-highlighted:none")).not.toBeNull()
    })
})
