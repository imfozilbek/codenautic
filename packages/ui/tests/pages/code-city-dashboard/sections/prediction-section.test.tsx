import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PredictionSection } from "@/pages/code-city-dashboard/sections/prediction-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockCodeCityState } from "./mock-code-city-state"

const { mockCityPredictionOverlay } = vi.hoisted(() => ({
    mockCityPredictionOverlay: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<unknown>
            readonly activeFileId?: string
        }): React.JSX.Element => (
            <div>
                <p>prediction-overlay-entries:{props.entries.length}</p>
                <p>prediction-overlay-active:{props.activeFileId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockPredictionDashboard } = vi.hoisted(() => ({
    mockPredictionDashboard: vi.fn(
        (props: {
            readonly hotspots: ReadonlyArray<unknown>
            readonly bugProneFiles: ReadonlyArray<unknown>
            readonly activeHotspotId?: string
        }): React.JSX.Element => (
            <div>
                <p>pred-hotspots:{props.hotspots.length}</p>
                <p>pred-bugprone:{props.bugProneFiles.length}</p>
                <p>pred-active:{props.activeHotspotId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockPredictionExplainPanel } = vi.hoisted(() => ({
    mockPredictionExplainPanel: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<unknown>
            readonly activeFileId?: string
        }): React.JSX.Element => (
            <div>
                <p>explain-entries:{props.entries.length}</p>
                <p>explain-active:{props.activeFileId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockTrendForecastChart } = vi.hoisted(() => ({
    mockTrendForecastChart: vi.fn(
        (props: {
            readonly points: ReadonlyArray<unknown>
            readonly activePointId?: string
        }): React.JSX.Element => (
            <div>
                <p>forecast-points:{props.points.length}</p>
                <p>forecast-active:{props.activePointId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockPredictionAccuracyWidget } = vi.hoisted(() => ({
    mockPredictionAccuracyWidget: vi.fn(
        (props: {
            readonly cases: ReadonlyArray<unknown>
            readonly points: ReadonlyArray<unknown>
            readonly activeCaseId?: string
        }): React.JSX.Element => (
            <div>
                <p>accuracy-cases:{props.cases.length}</p>
                <p>accuracy-points:{props.points.length}</p>
                <p>accuracy-active:{props.activeCaseId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockAlertConfigDialog } = vi.hoisted(() => ({
    mockAlertConfigDialog: vi.fn(
        (props: { readonly modules: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>alert-modules:{props.modules.length}</p>
        ),
    ),
}))

vi.mock("@/components/codecity/overlays/city-prediction-overlay", () => ({
    CityPredictionOverlay: mockCityPredictionOverlay,
}))
vi.mock("@/components/predictions/prediction-dashboard", () => ({
    PredictionDashboard: mockPredictionDashboard,
}))
vi.mock("@/components/predictions/prediction-explain-panel", () => ({
    PredictionExplainPanel: mockPredictionExplainPanel,
}))
vi.mock("@/components/predictions/trend-forecast-chart", () => ({
    TrendForecastChart: mockTrendForecastChart,
}))
vi.mock("@/components/predictions/prediction-accuracy-widget", () => ({
    PredictionAccuracyWidget: mockPredictionAccuracyWidget,
}))
vi.mock("@/components/codecity/alert-config-dialog", () => ({
    AlertConfigDialog: mockAlertConfigDialog,
}))

describe("PredictionSection", (): void => {
    it("when rendered, then shows prediction overlay and dashboard", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<PredictionSection state={state} />)

        expect(screen.getByText("prediction-overlay-entries:1")).not.toBeNull()
        expect(screen.getByText("pred-hotspots:1")).not.toBeNull()
        expect(screen.getByText("pred-bugprone:1")).not.toBeNull()
    })

    it("when rendered, then shows explain panel and trend forecast", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<PredictionSection state={state} />)

        expect(screen.getByText("explain-entries:1")).not.toBeNull()
        expect(screen.getByText("forecast-points:1")).not.toBeNull()
    })

    it("when rendered, then shows accuracy widget and alert config dialog", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<PredictionSection state={state} />)

        expect(screen.getByText("accuracy-cases:1")).not.toBeNull()
        expect(screen.getByText("accuracy-points:1")).not.toBeNull()
        expect(screen.getByText("alert-modules:1")).not.toBeNull()
    })
})
