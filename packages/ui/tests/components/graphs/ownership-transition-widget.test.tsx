import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    OwnershipTransitionWidget,
    type IOwnershipTransitionEvent,
} from "@/components/team-analytics/ownership-transition-widget"
import { renderWithProviders } from "../../utils/render"

const MOCK_EVENTS: ReadonlyArray<IOwnershipTransitionEvent> = [
    {
        id: "event-1",
        fileId: "file-api",
        scopeType: "file",
        scopeLabel: "api/routes.ts",
        changedAt: "2025-06-15T00:00:00Z",
        fromOwnerName: "Alice",
        toOwnerName: "Bob",
        toOwnerId: "bob-id",
        handoffSeverity: "critical",
        reason: "No knowledge transfer session",
    },
    {
        id: "event-2",
        fileId: "file-core",
        scopeType: "module",
        scopeLabel: "Core Module",
        changedAt: "2025-07-01T00:00:00Z",
        fromOwnerName: "Carol",
        toOwnerName: "Dave",
        toOwnerId: "dave-id",
        handoffSeverity: "smooth",
        reason: "Paired for two sprints",
    },
]

describe("OwnershipTransitionWidget", (): void => {
    it("when rendered with events, then displays title and scope labels", (): void => {
        renderWithProviders(<OwnershipTransitionWidget events={MOCK_EVENTS} />)

        expect(screen.getByText("Ownership transition widget")).not.toBeNull()
        expect(screen.getByText("api/routes.ts")).not.toBeNull()
        expect(screen.getByText("Core Module")).not.toBeNull()
    })

    it("when handoffSeverity is critical, then shows Critical handoff badge", (): void => {
        renderWithProviders(<OwnershipTransitionWidget events={MOCK_EVENTS} />)

        expect(screen.getByText("Critical handoff")).not.toBeNull()
    })

    it("when handoffSeverity is smooth, then shows Smooth handoff badge", (): void => {
        renderWithProviders(<OwnershipTransitionWidget events={MOCK_EVENTS} />)

        expect(screen.getByText("Smooth handoff")).not.toBeNull()
    })

    it("when onSelectEvent provided and button clicked, then calls callback", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        renderWithProviders(
            <OwnershipTransitionWidget events={MOCK_EVENTS} onSelectEvent={onSelect} />,
        )

        const button = screen.getByRole("button", {
            name: /Inspect ownership transition api\/routes.ts/,
        })
        await user.click(button)

        expect(onSelect).toHaveBeenCalledWith(MOCK_EVENTS[0])
    })

    it("when event shows ownership transfer, then displays from and to names", (): void => {
        renderWithProviders(<OwnershipTransitionWidget events={MOCK_EVENTS} />)

        expect(screen.getByText(/Alice → Bob/)).not.toBeNull()
        expect(screen.getByText(/Carol → Dave/)).not.toBeNull()
    })

    it("when activeEventId matches, then highlights the active entry", (): void => {
        const { container } = renderWithProviders(
            <OwnershipTransitionWidget events={MOCK_EVENTS} activeEventId="event-2" />,
        )

        const items = container.querySelectorAll("li")
        const secondItem = items[1]
        expect(secondItem?.className).toContain("border-accent")
    })
})
