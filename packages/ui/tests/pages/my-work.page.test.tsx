import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

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
        expect(
            within(triageList).getByText("Tenant boundary regression in auth middleware"),
        ).not.toBeNull()

        fireEvent.keyDown(window, { altKey: true, key: "3" })
        expect(within(triageList).getByText("Scan worker stuck on queue heartbeat")).not.toBeNull()
        expect(
            within(triageList).queryByText("Notification digest pending confirmation"),
        ).toBeNull()
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

        const criticalMoreButton = within(criticalIssueRow).getByRole("button", { name: "More" })
        await user.click(criticalMoreButton)
        const assignMenuItem = await screen.findByRole("menuitem", { name: "Assign to me" })
        await user.click(assignMenuItem)
        expect(screen.getByText("Assigned MW-1002 to current reviewer.")).not.toBeNull()

        const reviewItem = within(triageList).getByText("CCR #412 needs final response")
        const reviewRow = reviewItem.closest("li")
        if (reviewRow === null) {
            throw new Error("Review row not found")
        }

        const reviewMoreButton = within(reviewRow).getByRole("button", { name: "More" })
        await user.click(reviewMoreButton)
        const markReadMenuItem = await screen.findByRole("menuitem", { name: "Mark read" })
        await user.click(markReadMenuItem)
        expect(screen.getByText("Marked MW-1001 as read.")).not.toBeNull()
    })

    it("применяет ownership permissions для escalation и пишет audit trail", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)
        await user.selectOptions(screen.getByRole("combobox", { name: "Triage scope" }), "team")
        await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer role" }), "viewer")

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        const criticalIssueItem = within(triageList).getByText(
            "Tenant boundary regression in auth middleware",
        )
        const criticalIssueRow = criticalIssueItem.closest("li")
        if (criticalIssueRow === null) {
            throw new Error("Critical issue row not found")
        }

        expect(within(criticalIssueRow).getByRole("button", { name: "Escalate" })).toBeDisabled()

        await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer role" }), "admin")
        await user.click(within(criticalIssueRow).getByRole("button", { name: "Escalate" }))

        expect(screen.getByText("Escalated MW-1002 and notified owner channel.")).not.toBeNull()
        expect(screen.getByText(/MW-1002 Escalate at/)).not.toBeNull()
    })

    it("open review действие выполняет переход в deep-link", async (): Promise<void> => {
        const user = userEvent.setup()
        const assignSpy = vi
            .spyOn(window.location, "assign")
            .mockImplementation((_url: string | URL): void => undefined)

        try {
            renderWithProviders(<MyWorkPage />)

            const triageList = screen.getByRole("list", { name: "My work triage list" })
            const reviewItem = within(triageList).getByText("CCR #412 needs final response")
            const reviewRow = reviewItem.closest("li")
            if (reviewRow === null) {
                throw new Error("Review row not found")
            }

            const moreButton = within(reviewRow).getByRole("button", { name: "More" })
            await user.click(moreButton)
            const openReviewMenuItem = await screen.findByRole("menuitem", { name: "Open review" })
            await user.click(openReviewMenuItem)

            expect(assignSpy).toHaveBeenCalledWith("/reviews/412")
            expect(screen.getByText("Opened MW-1001 context: /reviews/412")).not.toBeNull()
        } finally {
            assignSpy.mockRestore()
        }
    })

    it("snooze действие меняет статус item на snoozed", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        const reviewItem = within(triageList).getByText("CCR #412 needs final response")
        const reviewRow = reviewItem.closest("li")
        if (reviewRow === null) {
            throw new Error("Review row not found")
        }

        const moreButton = within(reviewRow).getByRole("button", { name: "More" })
        await user.click(moreButton)
        const snoozeMenuItem = await screen.findByRole("menuitem", { name: "Snooze" })
        await user.click(snoozeMenuItem)
        expect(screen.getByText("Snoozed MW-1001 until next triage cycle.")).not.toBeNull()
    })

    it("start work меняет статус item на in_progress", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)

        await user.selectOptions(screen.getByRole("combobox", { name: "Triage scope" }), "team")

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        const approvalItem = within(triageList).getByText("Approval pending for CCR #409")
        const approvalRow = approvalItem.closest("li")
        if (approvalRow === null) {
            throw new Error("Approval row not found")
        }

        await user.click(within(approvalRow).getByRole("button", { name: "Start work" }))
        expect(screen.getByText("Moved MW-1005 to in_progress.")).not.toBeNull()
    })

    it("mark done меняет статус item на done", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        const reviewItem = within(triageList).getByText("CCR #412 needs final response")
        const reviewRow = reviewItem.closest("li")
        if (reviewRow === null) {
            throw new Error("Review row not found")
        }

        await user.click(within(reviewRow).getByRole("button", { name: "Mark done" }))
        expect(screen.getByText("Marked MW-1001 as done.")).not.toBeNull()
    })

    it("viewer роль блокирует assign, start work и mark done кнопки", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)

        await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer role" }), "viewer")

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        const reviewItem = within(triageList).getByText("CCR #412 needs final response")
        const reviewRow = reviewItem.closest("li")
        if (reviewRow === null) {
            throw new Error("Review row not found")
        }

        expect(within(reviewRow).getByRole("button", { name: "Start work" })).toBeDisabled()
        expect(within(reviewRow).getByRole("button", { name: "Mark done" })).toBeDisabled()
        expect(within(reviewRow).getByRole("button", { name: "Escalate" })).toBeDisabled()
    })

    it("keyboard shortcut Alt+1 переключает scope на mine", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)

        await user.selectOptions(screen.getByRole("combobox", { name: "Triage scope" }), "team")

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        expect(
            within(triageList).getByText("Tenant boundary regression in auth middleware"),
        ).not.toBeNull()

        fireEvent.keyDown(window, { altKey: true, key: "1" })

        expect(
            within(triageList).queryByText("Tenant boundary regression in auth middleware"),
        ).toBeNull()
        expect(within(triageList).getByText("CCR #412 needs final response")).not.toBeNull()
    })

    it("keyboard shortcut Alt+2 переключает scope на team", async (): Promise<void> => {
        renderWithProviders(<MyWorkPage />)

        fireEvent.keyDown(window, { altKey: true, key: "2" })

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        expect(
            within(triageList).getByText("Tenant boundary regression in auth middleware"),
        ).not.toBeNull()
    })

    it("non-alt клавиши не изменяют scope", async (): Promise<void> => {
        renderWithProviders(<MyWorkPage />)

        fireEvent.keyDown(window, { altKey: false, key: "2" })

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        expect(
            within(triageList).queryByText("Tenant boundary regression in auth middleware"),
        ).toBeNull()
    })

    it("неизвестная alt+клавиша не изменяет scope", async (): Promise<void> => {
        renderWithProviders(<MyWorkPage />)

        fireEvent.keyDown(window, { altKey: true, key: "9" })

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        expect(within(triageList).getByText("CCR #412 needs final response")).not.toBeNull()
    })

    it("assign to me для viewer role показывает сообщение об ошибке прав", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)

        await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer role" }), "viewer")

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        const reviewItem = within(triageList).getByText("CCR #412 needs final response")
        const reviewRow = reviewItem.closest("li")
        if (reviewRow === null) {
            throw new Error("Review row not found")
        }

        const moreButton = within(reviewRow).getByRole("button", { name: "More" })
        await user.click(moreButton)
        const assignMenuItem = await screen.findByRole("menuitem", { name: "Assign to me" })
        expect(assignMenuItem).toHaveAttribute("data-disabled", "true")
    })

    it("показывает initial action summary text", async (): Promise<void> => {
        renderWithProviders(<MyWorkPage />)

        expect(screen.getByText("No triage actions yet.")).not.toBeNull()
    })

    it("показывает пустой audit trail при инициализации", async (): Promise<void> => {
        renderWithProviders(<MyWorkPage />)

        expect(screen.getByText("No ownership changes yet.")).not.toBeNull()
    })

    it("escalate увеличивает escalation level от none к warn", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        const reviewItem = within(triageList).getByText("CCR #412 needs final response")
        const reviewRow = reviewItem.closest("li")
        if (reviewRow === null) {
            throw new Error("Review row not found")
        }

        await user.click(within(reviewRow).getByRole("button", { name: "Escalate" }))
        expect(screen.getByText("Escalated MW-1001 and notified owner channel.")).not.toBeNull()
    })

    it("двойная escalation увеличивает level до critical", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<MyWorkPage />)

        const triageList = screen.getByRole("list", { name: "My work triage list" })
        const reviewItem = within(triageList).getByText("CCR #412 needs final response")
        const reviewRow = reviewItem.closest("li")
        if (reviewRow === null) {
            throw new Error("Review row not found")
        }

        await user.click(within(reviewRow).getByRole("button", { name: "Escalate" }))
        await user.click(within(reviewRow).getByRole("button", { name: "Escalate" }))

        expect(within(reviewRow).getByText("escalation: critical")).not.toBeNull()
    })

    it("deep-link доступен через overflow dropdown", async (): Promise<void> => {
        const user = userEvent.setup()
        const assignSpy = vi
            .spyOn(window.location, "assign")
            .mockImplementation((_url: string | URL): void => undefined)

        try {
            renderWithProviders(<MyWorkPage />)

            const triageList = screen.getByRole("list", { name: "My work triage list" })
            const reviewItem = within(triageList).getByText("CCR #412 needs final response")
            const reviewRow = reviewItem.closest("li")
            if (reviewRow === null) {
                throw new Error("Review row not found")
            }

            const moreButton = within(reviewRow).getByRole("button", { name: "More" })
            await user.click(moreButton)
            const deepLinkMenuItem = await screen.findByRole("menuitem", { name: "Deep-link" })
            await user.click(deepLinkMenuItem)

            expect(assignSpy).toHaveBeenCalledWith("/reviews/412")
        } finally {
            assignSpy.mockRestore()
        }
    })
})
