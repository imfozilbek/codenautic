import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TourSection } from "@/pages/code-city-dashboard/sections/tour-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockCodeCityState } from "./mock-code-city-state"

const { mockGuidedTourOverlay } = vi.hoisted(() => ({
    mockGuidedTourOverlay: vi.fn(
        (props: {
            readonly isActive: boolean
            readonly currentStepIndex: number
            readonly steps: ReadonlyArray<unknown>
        }): React.JSX.Element => (
            <div>
                <p>tour-active:{props.isActive ? "yes" : "no"}</p>
                <p>tour-step:{props.currentStepIndex}</p>
                <p>tour-steps:{props.steps.length}</p>
            </div>
        ),
    ),
}))
const { mockTourCustomizer } = vi.hoisted(() => ({
    mockTourCustomizer: vi.fn(
        (props: {
            readonly isAdmin: boolean
            readonly steps: ReadonlyArray<unknown>
        }): React.JSX.Element => (
            <div>
                <p>customizer-admin:{props.isAdmin ? "yes" : "no"}</p>
                <p>customizer-steps:{props.steps.length}</p>
            </div>
        ),
    ),
}))

vi.mock("@/components/codecity/guided-tour-overlay", () => ({
    GuidedTourOverlay: mockGuidedTourOverlay,
}))
vi.mock("@/components/codecity/tour-customizer", () => ({
    TourCustomizer: mockTourCustomizer,
}))

describe("TourSection", (): void => {
    it("when rendered, then shows guided tour overlay as active", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<TourSection state={state} />)

        expect(screen.getByText("tour-active:yes")).not.toBeNull()
        expect(screen.getByText("tour-step:0")).not.toBeNull()
        expect(screen.getByText("tour-steps:1")).not.toBeNull()
    })

    it("when rendered, then shows tour customizer with admin flag", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<TourSection state={state} />)

        expect(screen.getByText("customizer-admin:yes")).not.toBeNull()
        expect(screen.getByText("customizer-steps:1")).not.toBeNull()
    })

    it("when tour is inactive, then overlay reflects disabled state", (): void => {
        const state = createMockCodeCityState({
            isGuidedTourActive: false,
            guidedTourStepIndex: 2,
        })
        renderWithProviders(<TourSection state={state} />)

        expect(screen.getByText("tour-active:no")).not.toBeNull()
        expect(screen.getByText("tour-step:2")).not.toBeNull()
    })
})
