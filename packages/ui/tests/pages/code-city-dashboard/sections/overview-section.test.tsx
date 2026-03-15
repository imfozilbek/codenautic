import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { OverviewSection } from "@/pages/code-city-dashboard/sections/overview-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockCodeCityState } from "./mock-code-city-state"

const { mockProjectOverviewPanel } = vi.hoisted(() => ({
    mockProjectOverviewPanel: vi.fn(
        (props: {
            readonly files: ReadonlyArray<unknown>
            readonly repositoryId: string
            readonly repositoryLabel: string
        }): React.JSX.Element => (
            <div>
                <p>overview-repo:{props.repositoryId}</p>
                <p>overview-label:{props.repositoryLabel}</p>
                <p>overview-files:{props.files.length}</p>
            </div>
        ),
    ),
}))
const { mockExploreModeSidebar } = vi.hoisted(() => ({
    mockExploreModeSidebar: vi.fn(
        (props: { readonly paths: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>explore-paths:{props.paths.length}</p>
        ),
    ),
}))
const { mockHotAreaHighlights } = vi.hoisted(() => ({
    mockHotAreaHighlights: vi.fn(
        (props: { readonly highlights: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>hot-areas:{props.highlights.length}</p>
        ),
    ),
}))
const { mockOnboardingProgressTracker } = vi.hoisted(() => ({
    mockOnboardingProgressTracker: vi.fn(
        (props: { readonly modules: ReadonlyArray<unknown> }): React.JSX.Element => (
            <p>onboarding-modules:{props.modules.length}</p>
        ),
    ),
}))

vi.mock("@/components/codecity/project-overview-panel", () => ({
    ProjectOverviewPanel: mockProjectOverviewPanel,
}))
vi.mock("@/components/codecity/explore-mode-sidebar", () => ({
    ExploreModeSidebar: mockExploreModeSidebar,
}))
vi.mock("@/components/codecity/hot-area-highlights", () => ({
    HotAreaHighlights: mockHotAreaHighlights,
}))
vi.mock("@/components/codecity/onboarding-progress-tracker", () => ({
    OnboardingProgressTracker: mockOnboardingProgressTracker,
}))

describe("OverviewSection", (): void => {
    it("when rendered, then shows project overview panel with repository data", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<OverviewSection state={state} />)

        expect(screen.getByText("overview-repo:repo-1")).not.toBeNull()
        expect(screen.getByText("overview-label:Repository Alpha")).not.toBeNull()
        expect(screen.getByText("overview-files:1")).not.toBeNull()
    })

    it("when rendered, then shows explore mode sidebar and hot area highlights", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<OverviewSection state={state} />)

        expect(screen.getByText("explore-paths:1")).not.toBeNull()
        expect(screen.getByText("hot-areas:1")).not.toBeNull()
    })

    it("when rendered, then shows onboarding progress tracker", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<OverviewSection state={state} />)

        expect(screen.getByText("onboarding-modules:1")).not.toBeNull()
    })
})
