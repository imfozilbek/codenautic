import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { OwnershipSection } from "@/pages/code-city-dashboard/sections/ownership-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockCodeCityState } from "./mock-code-city-state"

const { mockCityOwnershipOverlay } = vi.hoisted(() => ({
    mockCityOwnershipOverlay: vi.fn(
        (props: {
            readonly owners: ReadonlyArray<unknown>
            readonly isEnabled: boolean
            readonly activeOwnerId?: string
        }): React.JSX.Element => (
            <div>
                <p>ownership-owners:{props.owners.length}</p>
                <p>ownership-enabled:{props.isEnabled ? "yes" : "no"}</p>
                <p>ownership-active:{props.activeOwnerId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockCityBusFactorOverlay } = vi.hoisted(() => ({
    mockCityBusFactorOverlay: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<unknown>
            readonly activeDistrictId?: string
        }): React.JSX.Element => (
            <div>
                <p>busfactor-entries:{props.entries.length}</p>
                <p>busfactor-active:{props.activeDistrictId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockBusFactorTrendChart } = vi.hoisted(() => ({
    mockBusFactorTrendChart: vi.fn(
        (props: {
            readonly series: ReadonlyArray<unknown>
            readonly activeModuleId?: string
        }): React.JSX.Element => (
            <div>
                <p>busfactor-trend-series:{props.series.length}</p>
                <p>busfactor-trend-active:{props.activeModuleId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockKnowledgeSiloPanel } = vi.hoisted(() => ({
    mockKnowledgeSiloPanel: vi.fn(
        (props: {
            readonly entries: ReadonlyArray<unknown>
            readonly activeSiloId?: string
        }): React.JSX.Element => (
            <div>
                <p>silo-entries:{props.entries.length}</p>
                <p>silo-active:{props.activeSiloId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockKnowledgeMapExportWidget } = vi.hoisted(() => ({
    mockKnowledgeMapExportWidget: vi.fn(
        (_props: { readonly model: unknown }): React.JSX.Element => <p>knowledge-export-loaded</p>,
    ),
}))
const { mockContributorCollaborationGraph } = vi.hoisted(() => ({
    mockContributorCollaborationGraph: vi.fn(
        (props: {
            readonly contributors: ReadonlyArray<unknown>
            readonly collaborations: ReadonlyArray<unknown>
            readonly activeContributorId?: string
        }): React.JSX.Element => (
            <div>
                <p>contrib-nodes:{props.contributors.length}</p>
                <p>contrib-edges:{props.collaborations.length}</p>
                <p>contrib-active:{props.activeContributorId ?? "none"}</p>
            </div>
        ),
    ),
}))
const { mockOwnershipTransitionWidget } = vi.hoisted(() => ({
    mockOwnershipTransitionWidget: vi.fn(
        (props: {
            readonly events: ReadonlyArray<unknown>
            readonly activeEventId?: string
        }): React.JSX.Element => (
            <div>
                <p>transition-events:{props.events.length}</p>
                <p>transition-active:{props.activeEventId ?? "none"}</p>
            </div>
        ),
    ),
}))

vi.mock("@/components/codecity/overlays/city-ownership-overlay", () => ({
    CityOwnershipOverlay: mockCityOwnershipOverlay,
}))
vi.mock("@/components/codecity/overlays/city-bus-factor-overlay", () => ({
    CityBusFactorOverlay: mockCityBusFactorOverlay,
}))
vi.mock("@/components/team-analytics/bus-factor-trend-chart", () => ({
    BusFactorTrendChart: mockBusFactorTrendChart,
}))
vi.mock("@/components/team-analytics/knowledge-silo-panel", () => ({
    KnowledgeSiloPanel: mockKnowledgeSiloPanel,
}))
vi.mock("@/components/team-analytics/knowledge-map-export-widget", () => ({
    KnowledgeMapExportWidget: mockKnowledgeMapExportWidget,
}))
vi.mock("@/components/team-analytics/contributor-collaboration-graph", () => ({
    ContributorCollaborationGraph: mockContributorCollaborationGraph,
}))
vi.mock("@/components/team-analytics/ownership-transition-widget", () => ({
    OwnershipTransitionWidget: mockOwnershipTransitionWidget,
}))

describe("OwnershipSection", (): void => {
    it("when rendered, then shows ownership overlay with owners and bus factor", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<OwnershipSection state={state} />)

        expect(screen.getByText("ownership-owners:1")).not.toBeNull()
        expect(screen.getByText("ownership-enabled:yes")).not.toBeNull()
        expect(screen.getByText("busfactor-entries:1")).not.toBeNull()
    })

    it("when rendered, then shows knowledge silo panel and export widget", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<OwnershipSection state={state} />)

        expect(screen.getByText("silo-entries:1")).not.toBeNull()
        expect(screen.getByText("knowledge-export-loaded")).not.toBeNull()
    })

    it("when rendered, then shows contributor graph and ownership transition", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<OwnershipSection state={state} />)

        expect(screen.getByText("contrib-nodes:1")).not.toBeNull()
        expect(screen.getByText("contrib-edges:1")).not.toBeNull()
        expect(screen.getByText("transition-events:1")).not.toBeNull()
    })
})
