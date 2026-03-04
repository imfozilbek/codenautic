import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    CausalOverlaySelector,
    type TCausalOverlayMode,
} from "@/components/graphs/causal-overlay-selector"
import { renderWithProviders } from "../utils/render"

describe("CausalOverlaySelector", (): void => {
    it("показывает активный overlay и toolbar кнопки", (): void => {
        renderWithProviders(<CausalOverlaySelector value="impact" onChange={vi.fn()} />)

        expect(screen.getByText("Active overlay: Impact map")).not.toBeNull()
        expect(
            screen.getByRole("button", {
                name: "Switch to Impact map overlay",
            }),
        ).toHaveAttribute("aria-pressed", "true")
        expect(screen.getByRole("combobox", { name: "Causal overlay" })).not.toBeNull()
    })

    it("вызывает onChange при выборе overlay из dropdown", async (): Promise<void> => {
        const user = userEvent.setup()
        const onChange = vi.fn<(value: TCausalOverlayMode) => void>()

        renderWithProviders(<CausalOverlaySelector value="impact" onChange={onChange} />)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Causal overlay" }),
            "root-cause",
        )

        expect(onChange).toHaveBeenCalledWith("root-cause")
    })

    it("вызывает onChange при клике на toolbar кнопку", async (): Promise<void> => {
        const user = userEvent.setup()
        const onChange = vi.fn<(value: TCausalOverlayMode) => void>()

        renderWithProviders(<CausalOverlaySelector value="impact" onChange={onChange} />)

        await user.click(
            screen.getByRole("button", {
                name: "Switch to Temporal coupling overlay",
            }),
        )

        expect(onChange).toHaveBeenCalledWith("temporal-coupling")
    })
})
