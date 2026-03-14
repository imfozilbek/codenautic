import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { RefactoringSection } from "@/pages/code-city-dashboard/sections/refactoring-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockCodeCityState } from "./mock-code-city-state"

const { mockRefactoringDashboard } = vi.hoisted(() => ({
    mockRefactoringDashboard: vi.fn(
        (props: { readonly targets: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>refactor-targets:{props.targets.length}</p>
        ),
    ),
}))
const { mockROICalculatorWidget } = vi.hoisted(() => ({
    mockROICalculatorWidget: vi.fn(
        (props: { readonly targets: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>roi-targets:{props.targets.length}</p>
        ),
    ),
}))
const { mockCityRefactoringOverlay } = vi.hoisted(() => ({
    mockCityRefactoringOverlay: vi.fn(
        (props: { readonly entries: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>refactor-overlay:{props.entries.length}</p>
        ),
    ),
}))
const { mockSimulationPanel } = vi.hoisted(() => ({
    mockSimulationPanel: vi.fn(
        (props: { readonly targets: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>simulation-targets:{props.targets.length}</p>
        ),
    ),
}))
const { mockRefactoringTimeline } = vi.hoisted(() => ({
    mockRefactoringTimeline: vi.fn(
        (props: { readonly tasks: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>timeline-tasks:{props.tasks.length}</p>
        ),
    ),
}))
const { mockRefactoringExportDialog } = vi.hoisted(() => ({
    mockRefactoringExportDialog: vi.fn(
        (props: { readonly targets: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>export-targets:{props.targets.length}</p>
        ),
    ),
}))
const { mockImpactAnalysisPanel } = vi.hoisted(() => ({
    mockImpactAnalysisPanel: vi.fn(
        (props: { readonly seeds: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>impact-seeds:{props.seeds.length}</p>
        ),
    ),
}))
const { mockCityImpactOverlay } = vi.hoisted(() => ({
    mockCityImpactOverlay: vi.fn(
        (props: { readonly entries: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>impact-overlay:{props.entries.length}</p>
        ),
    ),
}))

vi.mock("@/components/graphs/refactoring-dashboard", () => ({
    RefactoringDashboard: mockRefactoringDashboard,
}))
vi.mock("@/components/graphs/roi-calculator-widget", () => ({
    ROICalculatorWidget: mockROICalculatorWidget,
}))
vi.mock("@/components/graphs/city-refactoring-overlay", () => ({
    CityRefactoringOverlay: mockCityRefactoringOverlay,
}))
vi.mock("@/components/graphs/simulation-panel", () => ({
    SimulationPanel: mockSimulationPanel,
}))
vi.mock("@/components/graphs/refactoring-timeline", () => ({
    RefactoringTimeline: mockRefactoringTimeline,
}))
vi.mock("@/components/graphs/refactoring-export-dialog", () => ({
    RefactoringExportDialog: mockRefactoringExportDialog,
}))
vi.mock("@/components/graphs/impact-analysis-panel", () => ({
    ImpactAnalysisPanel: mockImpactAnalysisPanel,
}))
vi.mock("@/components/graphs/city-impact-overlay", () => ({
    CityImpactOverlay: mockCityImpactOverlay,
}))

describe("RefactoringSection", (): void => {
    it("when rendered, then shows refactoring dashboard and ROI calculator", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<RefactoringSection state={state} />)

        expect(screen.getByText("refactor-targets:1")).not.toBeNull()
        expect(screen.getByText("roi-targets:1")).not.toBeNull()
    })

    it("when rendered, then shows simulation panel and timeline", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<RefactoringSection state={state} />)

        expect(screen.getByText("simulation-targets:1")).not.toBeNull()
        expect(screen.getByText("timeline-tasks:1")).not.toBeNull()
    })

    it("when rendered, then shows impact analysis panel and overlays", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<RefactoringSection state={state} />)

        expect(screen.getByText("impact-seeds:1")).not.toBeNull()
        expect(screen.getByText("impact-overlay:1")).not.toBeNull()
        expect(screen.getByText("refactor-overlay:1")).not.toBeNull()
        expect(screen.getByText("export-targets:1")).not.toBeNull()
    })
})
