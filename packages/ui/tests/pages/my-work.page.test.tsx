import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ITriageItem } from "@/lib/api/endpoints/triage.endpoint"
import type { IUseTriageResult } from "@/lib/hooks/queries/use-triage"

const mockPerformAction = vi.fn()

const SEED_ITEMS_MINE: ReadonlyArray<ITriageItem> = [
    {
        id: "MW-1001",
        category: "assigned_ccr",
        title: "CCR #412 needs final response",
        severity: "high",
        repository: "frontend-team/ui-dashboard",
        owner: "me",
        deepLink: "/reviews/412",
        timestamp: "2026-03-14T10:00:00Z",
        isRead: false,
        status: "unassigned",
        dueAt: "2026-03-15T12:00:00Z",
        slaMinutes: 60,
        escalationLevel: "none",
    },
    {
        id: "MW-1003",
        category: "inbox_notification",
        title: "Notification digest pending confirmation",
        severity: "medium",
        repository: "backend-core/notification-worker",
        owner: "me",
        deepLink: "/notifications/digest",
        timestamp: "2026-03-13T08:00:00Z",
        isRead: true,
        status: "assigned",
        dueAt: "2026-03-16T08:00:00Z",
        slaMinutes: 120,
        escalationLevel: "none",
    },
]

const SEED_ITEMS_TEAM: ReadonlyArray<ITriageItem> = [
    ...SEED_ITEMS_MINE,
    {
        id: "MW-1002",
        category: "critical_issue",
        title: "Tenant boundary regression in auth middleware",
        severity: "critical",
        repository: "backend-core/auth-service",
        owner: "team",
        deepLink: "/issues/1002",
        timestamp: "2026-03-14T09:00:00Z",
        isRead: false,
        status: "unassigned",
        dueAt: "2026-03-14T08:00:00Z",
        slaMinutes: 30,
        escalationLevel: "none",
    },
    {
        id: "MW-1005",
        category: "pending_approval",
        title: "Approval pending for CCR #409",
        severity: "medium",
        repository: "frontend-team/ui-dashboard",
        owner: "team",
        deepLink: "/reviews/409",
        timestamp: "2026-03-12T07:00:00Z",
        isRead: false,
        status: "assigned",
        dueAt: "2026-03-17T12:00:00Z",
        slaMinutes: 180,
        escalationLevel: "none",
    },
]

const SEED_ITEMS_REPO: ReadonlyArray<ITriageItem> = [
    {
        id: "MW-1004",
        category: "stuck_job",
        title: "Scan worker stuck on queue heartbeat",
        severity: "high",
        repository: "backend-core/scan-worker",
        owner: "unassigned",
        deepLink: "/jobs/stuck/1004",
        timestamp: "2026-03-14T11:00:00Z",
        isRead: false,
        status: "blocked",
        dueAt: "2026-03-14T14:00:00Z",
        slaMinutes: 45,
        escalationLevel: "warn",
    },
]

/**
 * Применяет действие к triage item (зеркало applyTriageAction из хука).
 *
 * @param item Исходный item.
 * @param action Действие.
 * @returns Обновлённый item.
 */
function applyAction(item: ITriageItem, action: string): ITriageItem {
    if (action === "escalate") {
        return {
            ...item,
            escalationLevel: item.escalationLevel === "none" ? "warn" : "critical",
            status: item.status === "done" ? item.status : "blocked",
        }
    }
    if (action === "start_work") {
        return { ...item, status: "in_progress" }
    }
    if (action === "mark_done") {
        return { ...item, status: "done" }
    }
    if (action === "snooze") {
        return { ...item, status: "snoozed" }
    }
    if (action === "assign_to_me") {
        return { ...item, owner: "me" }
    }
    if (action === "mark_read") {
        return { ...item, isRead: true }
    }
    return item
}

/**
 * Мутабельный стейт для optimistic-подобных обновлений в тестах.
 * Ключ — scope, значение — текущие items (обновляются через mutate).
 */
const itemOverrides: Record<string, ReadonlyArray<ITriageItem>> = {}

/**
 * Возвращает seed items для scope с учётом optimistic overrides.
 *
 * @param scope Scope triage.
 * @returns Текущие items.
 */
function getItemsForScope(scope: string): ReadonlyArray<ITriageItem> {
    const overridden = itemOverrides[scope]
    if (overridden !== undefined) {
        return overridden
    }
    if (scope === "team") {
        return SEED_ITEMS_TEAM
    }
    if (scope === "repo") {
        return SEED_ITEMS_REPO
    }
    return SEED_ITEMS_MINE
}

let currentScope: string = "mine"

vi.mock("@/lib/hooks/queries/use-triage", () => {
    return {
        useTriage: (args: { readonly scope?: string }): IUseTriageResult => {
            const scope = args.scope ?? "mine"
            currentScope = scope

            const items = getItemsForScope(currentScope)

            return {
                triageQuery: {
                    data: { items, total: items.length },
                    isLoading: false,
                    isError: false,
                    error: null,
                } as unknown as IUseTriageResult["triageQuery"],
                performAction: {
                    mutate: (request: { readonly id: string; readonly action: string }): void => {
                        mockPerformAction(request)
                        const currentItems = getItemsForScope(currentScope)
                        const updatedItems = currentItems.map((item): ITriageItem => {
                            if (item.id === request.id) {
                                return applyAction(item, request.action)
                            }
                            return item
                        })
                        itemOverrides[currentScope] = updatedItems
                    },
                    isPending: false,
                } as unknown as IUseTriageResult["performAction"],
            }
        },
    }
})

import { MyWorkPage } from "@/pages/my-work.page"
import { renderWithProviders } from "../utils/render"

/**
 * HeroUI v3 Dropdown рендерит menuitem-элементы всех dropdown-меню в DOM,
 * даже когда они закрыты. findByRole("menuitem", ...) находит дубликаты.
 * Эта функция находит menuitem из активного (открытого) меню,
 * фильтруя по наличию aria-controls (присутствует только в открытом popover).
 */
async function findActiveMenuItem(name: string): Promise<HTMLElement> {
    const items = await screen.findAllByRole("menuitem", { name })
    const active = items.find((item): boolean => item.getAttribute("aria-controls") !== null)
    if (active !== undefined) {
        return active
    }
    const first = items[0]
    if (first === undefined) {
        throw new Error(`Active menuitem "${name}" not found`)
    }
    return first
}

describe("MyWorkPage", (): void => {
    beforeEach((): void => {
        mockPerformAction.mockClear()
        for (const key of Object.keys(itemOverrides)) {
            delete itemOverrides[key]
        }
        currentScope = "mine"
    })

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

        const criticalMoreButtons = within(criticalIssueRow).getAllByRole("button", {
            name: "More",
        })
        const criticalMoreButton = criticalMoreButtons[0]
        if (criticalMoreButton === undefined) {
            throw new Error("Critical issue More button not found")
        }
        await user.click(criticalMoreButton)
        const assignMenuItem = await findActiveMenuItem("Assign to me")
        await user.click(assignMenuItem)
        expect(screen.getByText("Assigned MW-1002 to current reviewer.")).not.toBeNull()

        const reviewItem = within(triageList).getByText("CCR #412 needs final response")
        const reviewRow = reviewItem.closest("li")
        if (reviewRow === null) {
            throw new Error("Review row not found")
        }

        const reviewMoreButtons = within(reviewRow).getAllByRole("button", { name: "More" })
        const reviewMoreButton = reviewMoreButtons[0]
        if (reviewMoreButton === undefined) {
            throw new Error("Review More button not found")
        }
        await user.click(reviewMoreButton)
        const markReadMenuItem = await findActiveMenuItem("Mark read")
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

            const moreButtons = within(reviewRow).getAllByRole("button", { name: "More" })
            const moreButton = moreButtons[0]
            if (moreButton === undefined) {
                throw new Error("More button not found")
            }
            await user.click(moreButton)
            const openReviewMenuItem = await findActiveMenuItem("Open review")
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

        const moreButtons = within(reviewRow).getAllByRole("button", { name: "More" })
        const moreButton = moreButtons[0]
        if (moreButton === undefined) {
            throw new Error("More button not found")
        }
        await user.click(moreButton)
        const snoozeMenuItem = await findActiveMenuItem("Snooze")
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

        const moreButtons = within(reviewRow).getAllByRole("button", { name: "More" })
        const moreButton = moreButtons[0]
        if (moreButton === undefined) {
            throw new Error("More button not found")
        }
        await user.click(moreButton)
        const assignMenuItem = await findActiveMenuItem("Assign to me")
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

            const moreButtons = within(reviewRow).getAllByRole("button", { name: "More" })
            const moreButton = moreButtons[0]
            if (moreButton === undefined) {
                throw new Error("More button not found")
            }
            await user.click(moreButton)
            const deepLinkMenuItem = await findActiveMenuItem("Deep-link")
            await user.click(deepLinkMenuItem)

            expect(assignSpy).toHaveBeenCalledWith("/reviews/412")
        } finally {
            assignSpy.mockRestore()
        }
    })
})
