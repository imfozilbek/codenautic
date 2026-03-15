import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ExploreModeSidebar,
    type IExploreModePathDescriptor,
} from "@/components/codecity/explore-mode-sidebar"
import { renderWithProviders } from "../../utils/render"

const MOCK_PATHS: ReadonlyArray<IExploreModePathDescriptor> = [
    {
        id: "path-1",
        title: "Hot spots tour",
        description: "Navigate through high-churn files",
        role: "developer",
        fileChainIds: ["file-1", "file-2"],
    },
    {
        id: "path-2",
        title: "Architecture overview",
        description: "Explore package boundaries",
        role: "architect",
        fileChainIds: ["file-3"],
    },
]

describe("ExploreModeSidebar", (): void => {
    it("when rendered with paths, then displays path titles", (): void => {
        renderWithProviders(<ExploreModeSidebar onNavigatePath={vi.fn()} paths={MOCK_PATHS} />)

        expect(screen.getByText("Hot spots tour")).not.toBeNull()
        expect(screen.getByText("Architecture overview")).not.toBeNull()
    })

    it("when path is clicked, then calls onNavigatePath", async (): Promise<void> => {
        const user = userEvent.setup()
        const onNavigate = vi.fn()

        renderWithProviders(<ExploreModeSidebar onNavigatePath={onNavigate} paths={MOCK_PATHS} />)

        const pathButton = screen.getByRole("button", { name: /Hot spots tour/ })
        await user.click(pathButton)

        expect(onNavigate).toHaveBeenCalledTimes(1)
        expect(onNavigate).toHaveBeenCalledWith(MOCK_PATHS[0])
    })

    it("when paths is empty, then renders empty state", (): void => {
        const { container } = renderWithProviders(
            <ExploreModeSidebar onNavigatePath={vi.fn()} paths={[]} />,
        )

        expect(container.querySelector("aside, nav, section")).not.toBeNull()
    })
})
