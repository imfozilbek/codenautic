import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ChatPanel, type IChatPanelMessage } from "@/components/chat/chat-panel"
import { renderWithProviders } from "../utils/render"

const messageList: ReadonlyArray<IChatPanelMessage> = [
    {
        content: "**Система**: готовим анализ.",
        createdAt: "2026-03-03T10:00:00.000Z",
        id: "msg-system",
        role: "system",
        sender: "System",
    },
    {
        content: "Что думаешь о diff в `src/index.ts`?",
        createdAt: "2026-03-03T10:01:00.000Z",
        id: "msg-user",
        role: "user",
        sender: "Alice",
    },
    {
        content:
            "- Важный пункт\n```ts\nconst ok = true\nreturn ok\n```\n[Docs](/settings)",
        createdAt: "2026-03-03T10:02:00.000Z",
        id: "msg-assistant",
        role: "assistant",
        sender: "AI",
    },
]

describe("chat panel", (): void => {
    it("рендерит список сообщений и заголовок", (): void => {
        renderWithProviders(
            <ChatPanel
                isOpen
                messages={messageList}
                onSendMessage={vi.fn()}
                title="AI Concierge"
            />,
        )

        expect(screen.queryByRole("heading", { name: "AI Concierge" })).not.toBeNull()
        expect(screen.queryByText("Что думаешь о diff")).not.toBeNull()
        expect(screen.getByRole("log")).not.toBeNull()
    })

    it("рендерит markdown-блоки в ответе ассистента", (): void => {
        renderWithProviders(
            <ChatPanel
                isOpen
                messages={messageList}
                onSendMessage={vi.fn()}
            />,
        )

        expect(screen.queryByText("Система")).not.toBeNull()
        expect(screen.queryByText("const ok = true")).not.toBeNull()
        expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/settings")
    })

    it("отправляет сообщение и очищает input после submit", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSendMessage = vi.fn()

        renderWithProviders(
            <ChatPanel isOpen messages={[]} onSendMessage={onSendMessage} />,
        )

        const editor = screen.getByLabelText("Message input")
        const submit = screen.getByRole("button", { name: "Отправить" })

        await user.type(editor, "  health check  ")
        await user.click(submit)

        expect(onSendMessage).toHaveBeenCalledTimes(1)
        expect(onSendMessage).toHaveBeenCalledWith("health check")
        expect((editor as HTMLTextAreaElement).value).toBe("")
    })

    it("закрывает панель по кнопке", async (): Promise<void> => {
        const user = userEvent.setup()
        const onClose = vi.fn()

        renderWithProviders(
            <ChatPanel isOpen onClose={onClose} messages={[]} onSendMessage={vi.fn()} />,
        )

        const closeButton = screen.getByRole("button", { name: "Close chat panel" })
        await user.click(closeButton)
        expect(onClose).toHaveBeenCalledTimes(1)
    })
})
