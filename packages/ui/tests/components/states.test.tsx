import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EmptyState } from "@/components/states/empty-state"
import { ErrorState } from "@/components/states/error-state"
import { LoadingState } from "@/components/states/loading-state"
import { renderWithProviders } from "../utils/render"

describe("EmptyState", (): void => {
    it("when title is provided, then renders title text", (): void => {
        renderWithProviders(<EmptyState title="No results found" />)

        expect(screen.getByText("No results found")).not.toBeNull()
    })

    it("when description is provided, then renders description paragraph", (): void => {
        renderWithProviders(
            <EmptyState description="Try adjusting your filters" title="No results" />,
        )

        expect(screen.getByText("Try adjusting your filters")).not.toBeNull()
    })

    it("when description is not provided, then does not render description paragraph", (): void => {
        renderWithProviders(<EmptyState title="Empty" />)

        expect(screen.queryByText("Try adjusting")).toBeNull()
    })

    it("when icon is provided, then renders the icon element", (): void => {
        renderWithProviders(
            <EmptyState icon={<span data-testid="custom-icon">icon</span>} title="No data" />,
        )

        expect(screen.getByTestId("custom-icon")).not.toBeNull()
    })

    it("when icon is not provided, then does not render the icon container", (): void => {
        const { container } = renderWithProviders(<EmptyState title="No data" />)

        const iconContainer = container.querySelector(".text-text-subtle")
        expect(iconContainer).toBeNull()
    })

    it("when actionLabel and onAction are provided, then renders action button", async (): Promise<void> => {
        const user = userEvent.setup()
        const onAction = vi.fn()

        renderWithProviders(
            <EmptyState actionLabel="Create new" title="No items" onAction={onAction} />,
        )

        const button = screen.getByRole("button", { name: "Create new" })
        expect(button).not.toBeNull()
        await user.click(button)
        expect(onAction).toHaveBeenCalledTimes(1)
    })

    it("when actionLabel is missing, then does not render action button", (): void => {
        const onAction = vi.fn()
        renderWithProviders(<EmptyState title="No items" onAction={onAction} />)

        expect(screen.queryByRole("button")).toBeNull()
    })

    it("when onAction is missing, then does not render action button", (): void => {
        renderWithProviders(<EmptyState actionLabel="Create new" title="No items" />)

        expect(screen.queryByRole("button")).toBeNull()
    })

    it("when className is provided, then applies custom class", (): void => {
        const { container } = renderWithProviders(
            <EmptyState className="my-custom-class" title="No data" />,
        )

        const wrapper = container.firstElementChild
        expect(wrapper?.className).toContain("my-custom-class")
    })
})

describe("ErrorState", (): void => {
    it("when description is provided, then renders error description", (): void => {
        renderWithProviders(<ErrorState description="Network timeout occurred" />)

        expect(screen.getByText("Network timeout occurred")).not.toBeNull()
    })

    it("when title is not provided, then renders default title", (): void => {
        renderWithProviders(<ErrorState description="Something broke" />)

        expect(screen.getByText("Something went wrong")).not.toBeNull()
    })

    it("when title is provided, then renders custom title", (): void => {
        renderWithProviders(<ErrorState description="Connection lost" title="Connection error" />)

        expect(screen.getByText("Connection error")).not.toBeNull()
        expect(screen.queryByText("Something went wrong")).toBeNull()
    })

    it("when onRetry is provided, then renders retry button with default label", async (): Promise<void> => {
        const user = userEvent.setup()
        const onRetry = vi.fn()

        renderWithProviders(<ErrorState description="Failed to load" onRetry={onRetry} />)

        const button = screen.getByRole("button", { name: "Retry" })
        expect(button).not.toBeNull()
        await user.click(button)
        expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it("when retryLabel is provided, then renders button with custom label", (): void => {
        renderWithProviders(
            <ErrorState description="Failed" retryLabel="Try again" onRetry={vi.fn()} />,
        )

        expect(screen.getByRole("button", { name: "Try again" })).not.toBeNull()
        expect(screen.queryByRole("button", { name: "Retry" })).toBeNull()
    })

    it("when onRetry is not provided, then does not render retry button", (): void => {
        renderWithProviders(<ErrorState description="Error happened" />)

        expect(screen.queryByRole("button")).toBeNull()
    })

    it("when rendered, then shows error icon svg", (): void => {
        const { container } = renderWithProviders(<ErrorState description="Error" />)

        const svg = container.querySelector("svg")
        expect(svg).not.toBeNull()
        expect(svg?.getAttribute("aria-hidden")).toBe("true")
    })
})

describe("LoadingState", (): void => {
    it("when rendered with default props, then shows 3 skeleton rows", (): void => {
        const { container } = renderWithProviders(<LoadingState />)

        const wrapper = container.firstElementChild
        expect(wrapper).not.toBeNull()
        expect(wrapper?.children.length).toBe(3)
    })

    it("when rows is specified, then renders exact number of skeletons", (): void => {
        const { container } = renderWithProviders(<LoadingState rows={5} />)

        const wrapper = container.firstElementChild
        expect(wrapper?.children.length).toBe(5)
    })

    it("when rows is 1, then renders single skeleton", (): void => {
        const { container } = renderWithProviders(<LoadingState rows={1} />)

        const wrapper = container.firstElementChild
        expect(wrapper?.children.length).toBe(1)
    })

    it("when className is provided, then applies custom class to wrapper", (): void => {
        const { container } = renderWithProviders(<LoadingState className="custom-loading" />)

        const wrapper = container.firstElementChild
        expect(wrapper?.className).toContain("custom-loading")
    })
})
