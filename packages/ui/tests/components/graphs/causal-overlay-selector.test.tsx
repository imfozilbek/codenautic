import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { CausalOverlaySelector } from "@/components/graphs/causal-overlay-selector"
import { renderWithProviders } from "../../utils/render"

describe("CausalOverlaySelector", (): void => {
    it("when rendered with impact value, then shows impact button as pressed", (): void => {
        renderWithProviders(<CausalOverlaySelector value="impact" onChange={vi.fn()} />)

        const impactButton = screen.getByRole("button", {
            name: /Switch to Impact map overlay/,
        })
        expect(impactButton).toHaveAttribute("aria-pressed", "true")
    })

    it("when toolbar button is clicked, then calls onChange with new value", async (): Promise<void> => {
        const user = userEvent.setup()
        const onChange = vi.fn()

        renderWithProviders(<CausalOverlaySelector value="impact" onChange={onChange} />)

        const rootCauseButton = screen.getByRole("button", {
            name: /Switch to Root cause chain overlay/,
        })
        await user.click(rootCauseButton)

        expect(onChange).toHaveBeenCalledWith("root-cause")
    })

    it("when value changes, then active overlay text updates", (): void => {
        renderWithProviders(<CausalOverlaySelector value="temporal-coupling" onChange={vi.fn()} />)

        expect(screen.getByText(/Active overlay: Temporal coupling/)).not.toBeNull()
    })

    it("when select dropdown changes, then calls onChange", async (): Promise<void> => {
        const user = userEvent.setup()
        const onChange = vi.fn()

        renderWithProviders(<CausalOverlaySelector value="impact" onChange={onChange} />)

        const select = screen.getByRole("combobox", { name: "Causal overlay" })
        await user.selectOptions(select, "root-cause")

        expect(onChange).toHaveBeenCalledWith("root-cause")
    })

    it("when rendered, then shows all three overlay options in toolbar", (): void => {
        renderWithProviders(<CausalOverlaySelector value="impact" onChange={vi.fn()} />)

        const toolbar = screen.getByRole("toolbar")
        expect(toolbar.textContent).toContain("Impact map")
        expect(toolbar.textContent).toContain("Temporal coupling")
        expect(toolbar.textContent).toContain("Root cause chain")
    })
})
