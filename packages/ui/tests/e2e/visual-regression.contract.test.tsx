import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ChatPanel, type IChatPanelMessage } from "@/components/chat/chat-panel"
import { HelpDiagnosticsPage } from "@/pages/help-diagnostics.page"
import { renderWithProviders } from "../utils/render"

const visualMessages: ReadonlyArray<IChatPanelMessage> = [
    {
        content: "Critical path review started",
        createdAt: "2026-03-07T08:00:00.000Z",
        id: "m-1",
        role: "system",
        sender: "System",
    },
    {
        content: "Проверь [src/routes/reviews.tsx:42](src/routes/reviews.tsx:42)",
        createdAt: "2026-03-07T08:00:30.000Z",
        id: "m-2",
        role: "assistant",
        sender: "AI",
    },
]

describe("visual regression contract", (): void => {
    it("фиксирует визуальный shell для chat panel", (): void => {
        const { container } = renderWithProviders(
            <ChatPanel
                isOpen
                messages={visualMessages}
                onSendMessage={(): void => {
                    return
                }}
                title="AI Concierge"
            />,
        )

        expect(container.firstElementChild).toMatchSnapshot()
    })

    it("фиксирует визуальный shell для help diagnostics после запуска checks", async (): Promise<void> => {
        const user = userEvent.setup()
        const { container } = renderWithProviders(<HelpDiagnosticsPage />)

        await user.click(screen.getByRole("button", { name: "Run diagnostics" }))
        expect(screen.getByLabelText("Diagnostics checks list")).not.toBeNull()

        const diagnosticsShell = container.firstElementChild
        expect(diagnosticsShell).not.toBeNull()
        expect(diagnosticsShell).toMatchSnapshot()
    })
})
