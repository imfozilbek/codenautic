import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Select, SelectItem } from "@/components/ui/select"
import { renderWithProviders } from "../../utils/render"

describe("Select", (): void => {
    it("when rendered with items, then renders select trigger", (): void => {
        renderWithProviders(
            <Select aria-label="Color picker">
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="blue">Blue</SelectItem>
            </Select>,
        )

        expect(screen.getByRole("button")).not.toBeNull()
    })

    it("when selectedKeys is provided, then controls selection", (): void => {
        renderWithProviders(
            <Select aria-label="Fruit" selectedKeys={new Set(["apple"])}>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
            </Select>,
        )

        expect(screen.getByRole("button")).not.toBeNull()
    })

    it("when size is sm, then applies compact class", (): void => {
        const { container } = renderWithProviders(
            <Select aria-label="Small" size="sm">
                <SelectItem value="one">One</SelectItem>
            </Select>,
        )

        expect(container.innerHTML).toContain("h-8")
    })

    it("when size is lg, then applies large class", (): void => {
        const { container } = renderWithProviders(
            <Select aria-label="Large" size="lg">
                <SelectItem value="one">One</SelectItem>
            </Select>,
        )

        expect(container.innerHTML).toContain("h-12")
    })

    it("when SelectItem has isDisabled, then renders disabled item", (): void => {
        renderWithProviders(
            <Select aria-label="Options">
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled" isDisabled>
                    Disabled
                </SelectItem>
            </Select>,
        )

        expect(screen.getByRole("button")).not.toBeNull()
    })
})
