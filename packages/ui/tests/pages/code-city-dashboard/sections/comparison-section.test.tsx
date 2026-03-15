import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ComparisonSection } from "@/pages/code-city-dashboard/sections/comparison-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockCodeCityState } from "./mock-code-city-state"

const { mockPredictionComparisonView } = vi.hoisted(() => ({
    mockPredictionComparisonView: vi.fn(
        (props: {
            readonly snapshots: ReadonlyArray<unknown>
            readonly activeSnapshotId?: string
        }): React.JSX.Element => (
            <div>
                <p>comparison-snapshots:{props.snapshots.length}</p>
                <p>comparison-active:{props.activeSnapshotId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockSprintComparisonView } = vi.hoisted(() => ({
    mockSprintComparisonView: vi.fn(
        (props: {
            readonly snapshots: ReadonlyArray<unknown>
            readonly activeSnapshotId?: string
        }): React.JSX.Element => (
            <div>
                <p>sprint-snapshots:{props.snapshots.length}</p>
                <p>sprint-active:{props.activeSnapshotId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockDistrictTrendIndicators } = vi.hoisted(() => ({
    mockDistrictTrendIndicators: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<unknown>
            readonly activeDistrictId?: string
        }): React.JSX.Element => (
            <div>
                <p>district-entries:{props.entries.length}</p>
                <p>district-active:{props.activeDistrictId ?? "none"}</p>
            </div>
        ),
    ),
}))

vi.mock("@/components/predictions/prediction-comparison-view", () => ({
    PredictionComparisonView: mockPredictionComparisonView,
}))
vi.mock("@/components/team-analytics/sprint-comparison-view", () => ({
    SprintComparisonView: mockSprintComparisonView,
}))
vi.mock("@/components/codecity/district-trend-indicators", () => ({
    DistrictTrendIndicators: mockDistrictTrendIndicators,
}))

describe("ComparisonSection", (): void => {
    it("when rendered, then shows prediction comparison view with snapshots", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<ComparisonSection state={state} />)

        expect(screen.getByText("comparison-snapshots:1")).not.toBeNull()
        expect(screen.getByText("comparison-active:none")).not.toBeNull()
    })

    it("when rendered, then shows sprint comparison view with snapshots", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<ComparisonSection state={state} />)

        expect(screen.getByText("sprint-snapshots:1")).not.toBeNull()
        expect(screen.getByText("sprint-active:none")).not.toBeNull()
    })

    it("when rendered, then shows district trend indicators with entries", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<ComparisonSection state={state} />)

        expect(screen.getByText("district-entries:1")).not.toBeNull()
        expect(screen.getByText("district-active:none")).not.toBeNull()
    })
})
