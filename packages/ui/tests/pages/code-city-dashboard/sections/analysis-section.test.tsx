import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AnalysisSection } from "@/pages/code-city-dashboard/sections/analysis-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockCodeCityState } from "./mock-code-city-state"

const { mockChangeRiskGauge } = vi.hoisted(() => ({
    mockChangeRiskGauge: vi.fn(
        (props: {
            readonly currentScore: number
            readonly historicalPoints: ReadonlyArray<unknown>
        }): React.JSX.Element => (
            <div>
                <p>risk-gauge-score:{props.currentScore}</p>
                <p>risk-gauge-points:{props.historicalPoints.length}</p>
            </div>
        ),
    ),
}))
const { mockImpactGraphView } = vi.hoisted(() => ({
    mockImpactGraphView: vi.fn(
        (props: {
            readonly nodes: ReadonlyArray<unknown>
            readonly edges: ReadonlyArray<unknown>
        }): React.JSX.Element => (
            <div>
                <p>impact-nodes:{props.nodes.length}</p>
                <p>impact-edges:{props.edges.length}</p>
            </div>
        ),
    ),
}))
const { mockWhatIfPanel } = vi.hoisted(() => ({
    mockWhatIfPanel: vi.fn(
        (props: { readonly options: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>what-if-options:{props.options.length}</p>
        ),
    ),
}))

vi.mock("@/components/predictions/change-risk-gauge", () => ({
    ChangeRiskGauge: mockChangeRiskGauge,
}))
vi.mock("@/components/predictions/impact-graph-view", () => ({
    ImpactGraphView: mockImpactGraphView,
}))
vi.mock("@/components/predictions/what-if-panel", () => ({
    WhatIfPanel: mockWhatIfPanel,
}))

describe("AnalysisSection", (): void => {
    it("when rendered, then shows change risk gauge card header", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<AnalysisSection state={state} />)

        expect(screen.getByText("risk-gauge-score:72")).not.toBeNull()
        expect(screen.getByText(/risk-gauge-points:2/)).not.toBeNull()
    })

    it("when rendered, then shows impact graph view with nodes and edges", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<AnalysisSection state={state} />)

        expect(screen.getByText("impact-nodes:1")).not.toBeNull()
        expect(screen.getByText("impact-edges:1")).not.toBeNull()
    })

    it("when rendered, then shows what-if panel with options", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<AnalysisSection state={state} />)

        expect(screen.getByText("what-if-options:1")).not.toBeNull()
    })
})
