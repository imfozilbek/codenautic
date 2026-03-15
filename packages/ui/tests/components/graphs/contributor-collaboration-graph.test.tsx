import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ContributorCollaborationGraph,
    type IContributorCollaborationNode,
    type IContributorCollaborationEdge,
} from "@/components/team-analytics/contributor-collaboration-graph"
import { renderWithProviders } from "../../utils/render"

const MOCK_CONTRIBUTORS: ReadonlyArray<IContributorCollaborationNode> = [
    { contributorId: "alice", label: "Alice", commitCount: 120 },
    { contributorId: "bob", label: "Bob", commitCount: 80 },
    { contributorId: "carol", label: "Carol", commitCount: 40 },
]

const MOCK_COLLABORATIONS: ReadonlyArray<IContributorCollaborationEdge> = [
    { sourceContributorId: "alice", targetContributorId: "bob", coAuthorCount: 15 },
    { sourceContributorId: "bob", targetContributorId: "carol", coAuthorCount: 5 },
]

describe("ContributorCollaborationGraph", (): void => {
    it("when rendered with contributors, then displays title and contributor labels", (): void => {
        renderWithProviders(
            <ContributorCollaborationGraph
                contributors={MOCK_CONTRIBUTORS}
                collaborations={MOCK_COLLABORATIONS}
            />,
        )

        expect(screen.getByText("Contributor collaboration graph")).not.toBeNull()
        expect(screen.getByText("Alice")).not.toBeNull()
        expect(screen.getByText("Bob")).not.toBeNull()
        expect(screen.getByText("Carol")).not.toBeNull()
    })

    it("when contributor node clicked, then calls onSelectContributor", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <ContributorCollaborationGraph
                contributors={MOCK_CONTRIBUTORS}
                collaborations={MOCK_COLLABORATIONS}
                onSelectContributor={onSelect}
            />,
        )

        const aliceNode = screen.getByRole("button", {
            name: /Focus contributor Alice/,
        })
        await user.click(aliceNode)

        expect(onSelect).toHaveBeenCalledWith("alice")
    })

    it("when contributors are provided, then renders SVG nodes", (): void => {
        const { container } = renderWithProviders(
            <ContributorCollaborationGraph
                contributors={MOCK_CONTRIBUTORS}
                collaborations={MOCK_COLLABORATIONS}
            />,
        )

        const nodes = container.querySelectorAll("[data-testid^='contributor-node-']")
        expect(nodes.length).toBe(3)
    })

    it("when contributors is empty, then renders section without nodes", (): void => {
        const { container } = renderWithProviders(
            <ContributorCollaborationGraph contributors={[]} collaborations={[]} />,
        )

        const nodes = container.querySelectorAll("[data-testid^='contributor-node-']")
        expect(nodes.length).toBe(0)
    })

    it("when activeContributorId matches, then highlights active node", (): void => {
        const { container } = renderWithProviders(
            <ContributorCollaborationGraph
                contributors={MOCK_CONTRIBUTORS}
                collaborations={MOCK_COLLABORATIONS}
                activeContributorId="bob"
            />,
        )

        const bobCircle = container.querySelector("[data-testid='contributor-node-bob']")
        expect(bobCircle).not.toBeNull()
        expect(bobCircle?.getAttribute("stroke-width")).toBe("3")
    })
})
