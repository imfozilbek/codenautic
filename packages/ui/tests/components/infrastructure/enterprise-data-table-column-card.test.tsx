import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ColumnCard,
    type IColumnCardProps,
} from "@/components/infrastructure/enterprise-data-table-column-card"
import { renderWithProviders } from "../../utils/render"

function createDefaultProps(overrides: Partial<IColumnCardProps> = {}): IColumnCardProps {
    return {
        columnId: "col-1",
        header: "Name",
        index: 1,
        totalColumns: 5,
        isVisible: true,
        canHide: true,
        pinnedSide: false,
        currentWidth: 200,
        onToggleVisibility: vi.fn(),
        onMoveLeft: vi.fn(),
        onMoveRight: vi.fn(),
        onPinChange: vi.fn(),
        onWidthChange: vi.fn(),
        onWidthChangeEnd: vi.fn(),
        ...overrides,
    }
}

describe("ColumnCard", (): void => {
    it("when rendered, then shows column header", (): void => {
        const props = createDefaultProps()
        renderWithProviders(<ColumnCard {...props} />)

        expect(screen.getByText("Name")).not.toBeNull()
    })

    it("when isVisible is false, then shows hidden chip and reduces opacity", (): void => {
        const props = createDefaultProps({ isVisible: false })
        const { container } = renderWithProviders(<ColumnCard {...props} />)

        expect(screen.getByText("Hidden")).not.toBeNull()
        const card = container.firstElementChild
        expect(card?.className).toContain("opacity-50")
    })

    it("when canHide is true, then renders toggle visibility button", (): void => {
        const props = createDefaultProps({ canHide: true, isVisible: true })
        renderWithProviders(<ColumnCard {...props} />)

        const hideButton = screen.getByRole("button", { name: /Hide column Name/ })
        expect(hideButton).not.toBeNull()
    })

    it("when canHide is false, then does not render toggle visibility button", (): void => {
        const props = createDefaultProps({ canHide: false })
        renderWithProviders(<ColumnCard {...props} />)

        expect(screen.queryByRole("button", { name: /Hide column/ })).toBeNull()
        expect(screen.queryByRole("button", { name: /Show column/ })).toBeNull()
    })

    it("when toggle visibility clicked, then calls onToggleVisibility", async (): Promise<void> => {
        const user = userEvent.setup()
        const onToggleVisibility = vi.fn()
        const props = createDefaultProps({ onToggleVisibility })
        renderWithProviders(<ColumnCard {...props} />)

        const hideButton = screen.getByRole("button", { name: /Hide column Name/ })
        await user.click(hideButton)

        expect(onToggleVisibility).toHaveBeenCalledTimes(1)
    })

    it("when index is 0, then move left button is disabled", (): void => {
        const props = createDefaultProps({ index: 0 })
        renderWithProviders(<ColumnCard {...props} />)

        const moveLeftButton = screen.getByRole("button", { name: /Move left/ })
        expect(moveLeftButton).toBeDisabled()
    })

    it("when index is last, then move right button is disabled", (): void => {
        const props = createDefaultProps({ index: 4, totalColumns: 5 })
        renderWithProviders(<ColumnCard {...props} />)

        const moveRightButton = screen.getByRole("button", { name: /Move right/ })
        expect(moveRightButton).toBeDisabled()
    })

    it("when pinnedSide is left, then shows pinned left chip", (): void => {
        const props = createDefaultProps({ pinnedSide: "left" })
        renderWithProviders(<ColumnCard {...props} />)

        expect(screen.getByText("Pinned left")).not.toBeNull()
    })

    it("when pinnedSide is right, then shows pinned right chip", (): void => {
        const props = createDefaultProps({ pinnedSide: "right" })
        renderWithProviders(<ColumnCard {...props} />)

        expect(screen.getByText("Pinned right")).not.toBeNull()
    })
})
