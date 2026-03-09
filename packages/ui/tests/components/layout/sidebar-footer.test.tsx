import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SidebarFooter } from "@/components/layout/sidebar-footer"
import { renderWithProviders } from "../../utils/render"

describe("SidebarFooter", (): void => {
    it("рендерит user avatar с именем пользователя", (): void => {
        renderWithProviders(
            <SidebarFooter userName="Jane Doe" userEmail="jane@example.com" />,
        )

        expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0)
    })

    it("использует fallback 'User', когда userName не задан", (): void => {
        renderWithProviders(<SidebarFooter />)

        expect(screen.getAllByText("Пользователь").length).toBeGreaterThan(0)
    })

    it("вычисляет initials 'CN', когда userName не задан", (): void => {
        renderWithProviders(<SidebarFooter />)

        expect(screen.getAllByText("CN").length).toBeGreaterThan(0)
    })

    it("рендерит workspace switcher trigger, когда переданы organizations", (): void => {
        renderWithProviders(
            <SidebarFooter
                activeOrganizationId="org-1"
                organizations={[
                    { id: "org-1", label: "CodeNautic" },
                    { id: "org-2", label: "AnotherOrg" },
                ]}
                userName="Test User"
            />,
        )

        expect(screen.getByText("CodeNautic")).not.toBeNull()
    })

    it("показывает fallback 'Workspace', когда activeOrganizationId не найден", (): void => {
        renderWithProviders(
            <SidebarFooter
                activeOrganizationId="non-existent"
                organizations={[
                    { id: "org-1", label: "CodeNautic" },
                ]}
                userName="Test User"
            />,
        )

        expect(screen.getByText("Рабочее пространство")).not.toBeNull()
    })

    it("не рендерит workspace switcher, когда organizations не переданы", (): void => {
        renderWithProviders(<SidebarFooter userName="Test User" />)

        expect(screen.queryByText("Рабочее пространство")).toBeNull()
    })

    it("скрывает текст и показывает только иконки в collapsed режиме", (): void => {
        renderWithProviders(
            <SidebarFooter
                isCollapsed={true}
                organizations={[
                    { id: "org-1", label: "CodeNautic" },
                ]}
                activeOrganizationId="org-1"
                userName="Jane Doe"
            />,
        )

        expect(screen.queryByText("CodeNautic")).toBeNull()
        expect(screen.queryByText("Jane Doe")).toBeNull()
    })

    it("показывает menu items при клике на user dropdown trigger", async (): Promise<void> => {
        const user = userEvent.setup()
        const onOpenSettings = vi.fn()
        const onOpenBilling = vi.fn()
        const onOpenHelp = vi.fn()

        renderWithProviders(
            <SidebarFooter
                userName="Jane Doe"
                userEmail="jane@example.com"
                onOpenSettings={onOpenSettings}
                onOpenBilling={onOpenBilling}
                onOpenHelp={onOpenHelp}
            />,
        )

        const triggers = screen.getAllByRole("button", { name: /Jane Doe/i })
        const userTrigger = triggers.find(
            (button): boolean => button.getAttribute("aria-haspopup") === "true",
        )
        expect(userTrigger).not.toBeUndefined()

        if (userTrigger !== undefined) {
            await user.click(userTrigger)
        }

        expect(screen.getByText("Открыть настройки")).not.toBeNull()
        expect(screen.getByText("Открыть биллинг")).not.toBeNull()
        expect(screen.getByText("Помощь и диагностика")).not.toBeNull()
    })

    it("показывает Sign out в user menu, когда onSignOut передан", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSignOut = vi.fn()

        renderWithProviders(
            <SidebarFooter userName="Jane Doe" onSignOut={onSignOut} />,
        )

        const triggers = screen.getAllByRole("button", { name: /Jane Doe/i })
        const userTrigger = triggers.find(
            (button): boolean => button.getAttribute("aria-haspopup") === "true",
        )
        expect(userTrigger).not.toBeUndefined()

        if (userTrigger !== undefined) {
            await user.click(userTrigger)
        }

        expect(screen.getByText("Выйти")).not.toBeNull()
    })

    it("не рендерит Sign out кнопку, когда onSignOut не передан", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<SidebarFooter userName="Jane Doe" />)

        const triggers = screen.getAllByRole("button", { name: /Jane Doe/i })
        const userTrigger = triggers.find(
            (button): boolean => button.getAttribute("aria-haspopup") === "true",
        )
        expect(userTrigger).not.toBeUndefined()

        if (userTrigger !== undefined) {
            await user.click(userTrigger)
        }

        expect(screen.queryByText("Выйти")).toBeNull()
    })

    it("отображает email и имя пользователя в открытом user menu", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <SidebarFooter userName="Jane Doe" userEmail="jane@example.com" />,
        )

        const triggers = screen.getAllByRole("button", { name: /Jane Doe/i })
        const userTrigger = triggers.find(
            (button): boolean => button.getAttribute("aria-haspopup") === "true",
        )
        expect(userTrigger).not.toBeUndefined()

        if (userTrigger !== undefined) {
            await user.click(userTrigger)
        }

        expect(screen.getByText("jane@example.com")).not.toBeNull()
    })

    it("показывает fallback email в user menu, когда userEmail не задан", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<SidebarFooter userName="Jane Doe" />)

        const triggers = screen.getAllByRole("button", { name: /Jane Doe/i })
        const userTrigger = triggers.find(
            (button): boolean => button.getAttribute("aria-haspopup") === "true",
        )
        expect(userTrigger).not.toBeUndefined()

        if (userTrigger !== undefined) {
            await user.click(userTrigger)
        }

        expect(screen.getByText("user@example.com")).not.toBeNull()
    })

    it("открывает workspace dropdown с организациями при клике", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <SidebarFooter
                organizations={[
                    { id: "org-1", label: "Org Alpha" },
                    { id: "org-2", label: "Org Beta" },
                    { id: "org-3", label: "Org Gamma" },
                ]}
                activeOrganizationId="org-1"
                userName="Test User"
            />,
        )

        const workspaceTrigger = screen.getByText("Org Alpha").closest("button")
        expect(workspaceTrigger).not.toBeNull()

        if (workspaceTrigger !== null) {
            await user.click(workspaceTrigger)
        }

        expect(screen.getByText("Org Beta")).not.toBeNull()
        expect(screen.getByText("Org Gamma")).not.toBeNull()
    })

    it("в expanded режиме показывает текст user name и workspace label", (): void => {
        renderWithProviders(
            <SidebarFooter
                isCollapsed={false}
                organizations={[
                    { id: "org-1", label: "CodeNautic" },
                ]}
                activeOrganizationId="org-1"
                userName="Jane Doe"
            />,
        )

        expect(screen.getByText("CodeNautic")).not.toBeNull()
        expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0)
    })

    it("отображает initials пользователя в sr-only span", (): void => {
        renderWithProviders(<SidebarFooter userName="John Smith" />)

        const srOnlySpans = screen.getAllByText("JO")
        const hasSrOnly = srOnlySpans.some(
            (span): boolean => span.classList.contains("sr-only"),
        )
        expect(hasSrOnly).toBe(true)
    })

    it("показывает ChevronDown иконку в expanded режиме с organizations", (): void => {
        const { container } = renderWithProviders(
            <SidebarFooter
                isCollapsed={false}
                organizations={[
                    { id: "org-1", label: "CodeNautic" },
                ]}
                activeOrganizationId="org-1"
                userName="Test User"
            />,
        )

        const svgs = container.querySelectorAll("svg[aria-hidden='true']")
        expect(svgs.length).toBeGreaterThan(0)
    })

    it("не показывает ChevronDown и workspace label в collapsed режиме", (): void => {
        renderWithProviders(
            <SidebarFooter
                isCollapsed={true}
                organizations={[
                    { id: "org-1", label: "CodeNautic" },
                ]}
                activeOrganizationId="org-1"
                userName="Test User"
            />,
        )

        expect(screen.queryByText("CodeNautic")).toBeNull()
    })

    it("рендерит user menu с aria-label при открытии dropdown", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<SidebarFooter userName="Test User" />)

        const triggers = screen.getAllByRole("button", { name: /Test User/i })
        const userTrigger = triggers.find(
            (button): boolean => button.getAttribute("aria-haspopup") === "true",
        )
        expect(userTrigger).not.toBeUndefined()

        if (userTrigger !== undefined) {
            await user.click(userTrigger)
        }

        expect(screen.getByLabelText("Пользователь")).not.toBeNull()
    })

    it("рендерит user dropdown trigger с aria-haspopup", (): void => {
        renderWithProviders(<SidebarFooter userName="Test User" />)

        const triggers = screen.getAllByRole("button", { name: /Test User/i })
        const hasPopupTrigger = triggers.some(
            (button): boolean => button.getAttribute("aria-haspopup") === "true",
        )
        expect(hasPopupTrigger).toBe(true)
    })

    it("рендерит workspace trigger с aria-haspopup когда organizations переданы", (): void => {
        renderWithProviders(
            <SidebarFooter
                organizations={[
                    { id: "org-1", label: "CodeNautic" },
                ]}
                activeOrganizationId="org-1"
                userName="Test User"
            />,
        )

        const allTriggers = screen.getAllByRole("button")
        const popupTriggers = allTriggers.filter(
            (button): boolean => button.getAttribute("aria-haspopup") === "true",
        )
        expect(popupTriggers.length).toBe(2)
    })
})
