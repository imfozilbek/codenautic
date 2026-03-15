import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DriftViolationsSection } from "@/pages/settings-contract-validation/sections/drift-violations-section"
import { renderWithProviders } from "../../../utils/render"
import { createMockContractState } from "./mock-contract-state"

const { mockCodeCityTreemap } = vi.hoisted(() => ({
    mockCodeCityTreemap: vi.fn(
        (props: {
            readonly files: ReadonlyArray<unknown>
            readonly title: string
            readonly highlightedFileId?: string
        }): React.JSX.Element => (
            <div>
                <p>{props.title}</p>
                <p>drift-treemap-files:{props.files.length}</p>
                <p>drift-treemap-highlighted:{props.highlightedFileId ?? "none"}</p>
            </div>
        ),
    ),
}))

vi.mock("@/components/codecity/codecity-treemap", () => ({
    CodeCityTreemap: mockCodeCityTreemap,
}))

describe("DriftViolationsSection", (): void => {
    it("when rendered, then shows search, severity filter and sort controls", (): void => {
        const state = createMockContractState()
        renderWithProviders(<DriftViolationsSection state={state} />)

        expect(screen.getByLabelText("Drift report search query")).not.toBeNull()
        expect(screen.getByLabelText("Drift severity filter")).not.toBeNull()
        expect(screen.getByLabelText("Drift report sort mode")).not.toBeNull()
    })

    it("when violations exist, then shows violations list with details", (): void => {
        const state = createMockContractState()
        renderWithProviders(<DriftViolationsSection state={state} />)

        expect(screen.getByLabelText("Drift violations list")).not.toBeNull()
        expect(screen.getByText("no-cross-boundary")).not.toBeNull()
        expect(screen.getByText("Domain imports infrastructure")).not.toBeNull()
        expect(screen.getByText(/Filtered violations: 1/)).not.toBeNull()
    })

    it("when no violations found, then shows warning alert", (): void => {
        const state = createMockContractState({
            filteredSortedDriftViolations: [],
        })
        renderWithProviders(<DriftViolationsSection state={state} />)

        expect(screen.getByText("No drift violations found")).not.toBeNull()
    })

    it("when rendered, then shows drift overlay CodeCity treemap", (): void => {
        const state = createMockContractState()
        renderWithProviders(<DriftViolationsSection state={state} />)

        expect(screen.getByText("Architecture drift overlay treemap")).not.toBeNull()
    })
})
