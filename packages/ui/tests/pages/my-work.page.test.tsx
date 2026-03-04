import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { MyWorkPage } from "@/pages/my-work.page"
import { renderWithProviders } from "../utils/render"

describe("MyWorkPage", (): void => {
    it("объединяет triage поток и поддерживает scope filters + keyboard shortcuts", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)

        expect(screen.getByRole("heading", { level: 1, name: "My Work / Triage" })).not.toBeNull()

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        expect(within(triageList).getByText("CCR #412 needs final response")).not.toBeNull()
        expect(
            within(triageList).queryByText("Tenant boundary regression in auth middleware"),
        ).toBeNull()

        await user.selectOptions(screen.getByRole("combobox", { name: "Triage scope" }), "team")
        expect(within(triageList).getByText("Tenant boundary regression in auth middleware")).not
            .toBeNull()

        fireEvent.keyDown(window, { altKey: true, key: "3" })
        expect(within(triageList).getByText("Scan worker stuck on queue heartbeat")).not.toBeNull()
        expect(within(triageList).queryByText("Notification digest pending confirmation")).toBeNull()
    })

    it("выполняет inline triage actions без потери контекста", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)
        await user.selectOptions(screen.getByRole("combobox", { name: "Triage scope" }), "team")

        const triageList = screen.getByRole("list", { name: "My work triage list" })

        const criticalIssueItem = within(triageList).getByText(
            "Tenant boundary regression in auth middleware",
        )
        const criticalIssueRow = criticalIssueItem.closest("li")
        if (criticalIssueRow === null) {
            throw new Error("Critical issue row not found")
        }

        await user.click(within(criticalIssueRow).getByRole("button", { name: "Assign to me" }))
        expect(screen.getByText("Assigned MW-1002 to current reviewer.")).not.toBeNull()

        const reviewItem = within(triageList).getByText("CCR #412 needs final response")
        const reviewRow = reviewItem.closest("li")
        if (reviewRow === null) {
            throw new Error("Review row not found")
        }

        await user.click(within(reviewRow).getByRole("button", { name: "Mark read" }))
        expect(screen.getByText("Marked MW-1001 as read.")).not.toBeNull()
    })
})
