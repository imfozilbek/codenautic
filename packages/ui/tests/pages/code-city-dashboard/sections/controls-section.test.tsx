import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ControlsSection } from "@/pages/code-city-dashboard/sections/controls-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockCodeCityState } from "./mock-code-city-state"

const { mockCausalOverlaySelector } = vi.hoisted(() => ({
    mockCausalOverlaySelector: vi.fn(
        (props: { readonly value: string }): React.JSX.Element => <p>overlay-mode:{props.value}</p>,
    ),
}))

vi.mock("@/components/graphs/causal-overlay-selector", () => ({
    CausalOverlaySelector: mockCausalOverlaySelector,
}))

describe("ControlsSection", (): void => {
    it("when rendered, then shows repository and metric selects", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<ControlsSection state={state} />)

        expect(screen.getByLabelText(/Repository/i)).not.toBeNull()
        expect(screen.getByLabelText(/Metric/i)).not.toBeNull()
    })

    it("when rendered, then shows profile description", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<ControlsSection state={state} />)

        expect(screen.getByText("Test repository")).not.toBeNull()
    })

    it("when rendered, then shows causal overlay selector with current mode", (): void => {
        const state = createMockCodeCityState()
        renderWithProviders(<ControlsSection state={state} />)

        expect(screen.getByText("overlay-mode:impact")).not.toBeNull()
    })
})
