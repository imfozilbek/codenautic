import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ContributorCollaborationGraph,
    type IContributorCollaborationEdge,
    type IContributorCollaborationNode,
} from "@/components/graphs/contributor-collaboration-graph"
import { renderWithProviders } from "../utils/render"

const TEST_CONTRIBUTORS: ReadonlyArray<IContributorCollaborationNode> = [
    {
        commitCount: 42,
        contributorId: "alice",
        label: "Alice",
    },
    {
        commitCount: 18,
        contributorId: "max",
        label: "Max",
    },
    {
        commitCount: 11,
        contributorId: "nora",
        label: "Nora",
    },
]

const TEST_COLLABORATIONS: ReadonlyArray<IContributorCollaborationEdge> = [
    {
        coAuthorCount: 8,
        sourceContributorId: "alice",
        targetContributorId: "max",
    },
    {
        coAuthorCount: 3,
        sourceContributorId: "max",
        targetContributorId: "nora",
    },
]

describe("ContributorCollaborationGraph", (): void => {
    it("рендерит contributor graph и узлы с разными размерами", (): void => {
        renderWithProviders(
            <ContributorCollaborationGraph
                collaborations={TEST_COLLABORATIONS}
                contributors={TEST_CONTRIBUTORS}
            />,
        )

        expect(screen.getByText("Contributor collaboration graph")).not.toBeNull()
        expect(screen.getByLabelText("Contributor collaboration graph")).not.toBeNull()
        expect(screen.getByText("Alice")).not.toBeNull()
        expect(screen.getByText("Max")).not.toBeNull()

        const aliceNode = screen.getByTestId("contributor-node-alice")
        const maxNode = screen.getByTestId("contributor-node-max")
        const aliceRadius = Number(aliceNode.getAttribute("r"))
        const maxRadius = Number(maxNode.getAttribute("r"))
        expect(aliceRadius).toBeGreaterThan(maxRadius)
    })

    it("вызывает onSelectContributor по клику и keyboard", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectContributor = vi.fn()
        renderWithProviders(
            <ContributorCollaborationGraph
                collaborations={TEST_COLLABORATIONS}
                contributors={TEST_CONTRIBUTORS}
                onSelectContributor={onSelectContributor}
            />,
        )

        await user.click(screen.getByRole("button", { name: "Focus contributor Alice" }))
        const maxNode = screen.getByRole("button", { name: "Focus contributor Max" })
        maxNode.focus()
        fireEvent.keyDown(maxNode, { key: "Enter" })

        expect(onSelectContributor).toHaveBeenCalledTimes(2)
        expect(onSelectContributor).toHaveBeenCalledWith("alice")
        expect(onSelectContributor).toHaveBeenCalledWith("max")
    })
})
