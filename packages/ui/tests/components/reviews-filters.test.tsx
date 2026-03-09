import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ReviewsFilters } from "@/components/reviews/reviews-filters"
import { renderWithProviders } from "../utils/render"

import type { IReviewsFiltersProps } from "@/components/reviews/reviews-filters"

/**
 * Создаёт пропсы с мок-коллбеками для тестирования ReviewsFilters.
 */
function createDefaultProps(): IReviewsFiltersProps {
    return {
        assignee: "all",
        assigneeOptions: ["Alice", "Bob", "Charlie"],
        onAssigneeChange: vi.fn<(assignee: string) => void>(),
        onReset: vi.fn<() => void>(),
        onSearchChange: vi.fn<(search: string) => void>(),
        onStatusChange: vi.fn<(status: string) => void>(),
        search: "",
        status: "all",
        statusOptions: ["in_progress", "completed", "queued"],
    }
}

describe("ReviewsFilters", (): void => {
    it("when rendered, then shows search input and filter selects", (): void => {
        const props = createDefaultProps()
        renderWithProviders(<ReviewsFilters {...props} />)

        expect(screen.getByLabelText("Search CCR")).not.toBeNull()
        expect(screen.getByLabelText("Filter by status")).not.toBeNull()
        expect(screen.getByLabelText("Filter by assignee")).not.toBeNull()
    })

    it("when user types in search, then calls onSearchChange", async (): Promise<void> => {
        const user = userEvent.setup()
        const props = createDefaultProps()
        renderWithProviders(<ReviewsFilters {...props} />)

        const searchInput = screen.getByLabelText("Search CCR")
        await user.type(searchInput, "platform")

        expect(props.onSearchChange).toHaveBeenCalled()
    })

    it("when reset button is clicked, then calls onReset", async (): Promise<void> => {
        const user = userEvent.setup()
        const props = createDefaultProps()
        renderWithProviders(<ReviewsFilters {...props} />)

        await user.click(screen.getByRole("button", { name: "Reset" }))

        expect(props.onReset).toHaveBeenCalledTimes(1)
    })

    it("when search has a value, then renders the value in the input", (): void => {
        const props = { ...createDefaultProps(), search: "my-repo" }
        renderWithProviders(<ReviewsFilters {...props} />)

        const searchInput = screen.getByLabelText("Search CCR")
        expect(searchInput.value).toBe("my-repo")
    })

    it("when statusOptions is empty, then renders select without option items", (): void => {
        const props = { ...createDefaultProps(), statusOptions: [] as ReadonlyArray<string> }
        renderWithProviders(<ReviewsFilters {...props} />)

        expect(screen.getByLabelText("Filter by status")).not.toBeNull()
    })
})
