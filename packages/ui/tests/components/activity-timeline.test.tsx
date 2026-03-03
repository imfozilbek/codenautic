import type { ReactElement } from "react"

import userEvent, { type UserEvent } from "@testing-library/user-event"
import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ActivityTimeline, type IActivityTimelineEntry } from "@/components/dashboard/activity-timeline"
import { renderWithProviders } from "../utils/render"

const timeline: ReadonlyArray<IActivityTimelineEntry> = [
    {
        description: "Repository core scan finished successfully.",
        details: "3 files updated, 0 blockers.",
        group: "Today",
        id: "today-1",
        time: "16:10",
        title: "Scan finished",
    },
    {
        description: "New review queued from frontend.",
        details: "Queued with high priority, waiting for triage.",
        group: "Today",
        id: "today-2",
        time: "15:40",
        title: "New CCR queued",
    },
    {
        description: "Fallback provider enabled.",
        details: "OpenAI latency spike fallback to backup provider.",
        group: "Yesterday",
        id: "yesterday-1",
        time: "09:12",
        title: "Provider health",
    },
]

function TimelineHarness(): ReactElement {
    return <ActivityTimeline items={timeline} />
}

describe("activity timeline", (): void => {
    it("группирует события по дням", (): void => {
        renderWithProviders(<TimelineHarness />)

        expect(screen.queryByRole("heading", { name: "Today" })).not.toBeNull()
        expect(screen.queryByRole("heading", { name: "Yesterday" })).not.toBeNull()
    })

    it("раскрывает детали после клика", async (): Promise<void> => {
        const user: UserEvent = userEvent.setup()
        renderWithProviders(<TimelineHarness />)

        const detailSummary = screen.getByRole("button", { name: "View details" })
        expect(screen.queryByText("3 files updated, 0 blockers.")).toBeNull()
        await user.click(detailSummary)
        expect(screen.queryByText("3 files updated, 0 blockers.")).not.toBeNull()
    })
})
