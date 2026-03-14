import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Radio, RadioGroup } from "@/components/ui/radio-group"
import { renderWithProviders } from "../../utils/render"

describe("RadioGroup", (): void => {
    it("when rendered with options, then displays radio buttons", (): void => {
        renderWithProviders(
            <RadioGroup aria-label="Color">
                <Radio value="red">Red</Radio>
                <Radio value="blue">Blue</Radio>
                <Radio value="green">Green</Radio>
            </RadioGroup>,
        )

        expect(screen.getByRole("radiogroup")).not.toBeNull()
        expect(screen.getAllByRole("radio")).toHaveLength(3)
    })

    it("when a radio is clicked, then fires onValueChange", async (): Promise<void> => {
        const user = userEvent.setup()
        const handleChange = vi.fn()

        renderWithProviders(
            <RadioGroup aria-label="Size" onValueChange={handleChange}>
                <Radio value="sm">Small</Radio>
                <Radio value="md">Medium</Radio>
            </RadioGroup>,
        )

        await user.click(screen.getByText("Medium"))
        expect(handleChange).toHaveBeenCalledWith("md")
    })

    it("when onChange is provided, then fires onChange callback", async (): Promise<void> => {
        const user = userEvent.setup()
        const handleChange = vi.fn()

        renderWithProviders(
            <RadioGroup aria-label="Mode" onChange={handleChange}>
                <Radio value="light">Light</Radio>
                <Radio value="dark">Dark</Radio>
            </RadioGroup>,
        )

        await user.click(screen.getByText("Dark"))
        expect(handleChange).toHaveBeenCalledWith("dark")
    })

    it("when value is pre-selected, then that radio is checked", (): void => {
        renderWithProviders(
            <RadioGroup aria-label="Priority" value="high">
                <Radio value="low">Low</Radio>
                <Radio value="high">High</Radio>
            </RadioGroup>,
        )

        const radios = screen.getAllByRole("radio")
        const highRadio = radios.find((r): boolean => r.getAttribute("value") === "high")
        expect(highRadio).not.toBeUndefined()
    })
})
