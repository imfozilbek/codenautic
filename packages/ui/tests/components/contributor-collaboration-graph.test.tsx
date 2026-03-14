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
        contributorId: "neo",
        label: "Neo",
    },
    {
        commitCount: 18,
        contributorId: "trinity",
        label: "Trinity",
    },
    {
        commitCount: 11,
        contributorId: "morpheus",
        label: "Morpheus",
    },
]

const TEST_COLLABORATIONS: ReadonlyArray<IContributorCollaborationEdge> = [
    {
        coAuthorCount: 8,
        sourceContributorId: "neo",
        targetContributorId: "trinity",
    },
    {
        coAuthorCount: 3,
        sourceContributorId: "trinity",
        targetContributorId: "morpheus",
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
        expect(screen.getByText("Neo")).not.toBeNull()
        expect(screen.getByText("Trinity")).not.toBeNull()

        const aliceNode = screen.getByTestId("contributor-node-neo")
        const maxNode = screen.getByTestId("contributor-node-trinity")
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

        await user.click(screen.getByRole("button", { name: "Focus contributor Neo" }))
        const trinityNode = screen.getByRole("button", { name: "Focus contributor Trinity" })
        trinityNode.focus()
        fireEvent.keyDown(trinityNode, { key: "Enter" })

        expect(onSelectContributor).toHaveBeenCalledTimes(2)
        expect(onSelectContributor).toHaveBeenCalledWith("neo")
        expect(onSelectContributor).toHaveBeenCalledWith("trinity")
    })
})
