import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ChatPanel,
    type IChatPanelContext,
    type IChatPanelMessage,
} from "@/components/chat/chat-panel"
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

const chatContextItems: ReadonlyArray<IChatPanelContext> = [
    {
        attachedFiles: ["src/index.ts", "src/app.ts"],
        ccrNumber: "1201",
        id: "context-alpha",
        repoName: "repo-alpha",
    },
    {
        attachedFiles: ["README.md"],
        ccrNumber: "1202",
        id: "context-beta",
        repoName: "repo-beta",
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
        expect(screen.queryByText(/Что думаешь о diff/)).not.toBeNull()
        expect(screen.getByRole("log")).not.toBeNull()
    })

    it("рендерит markdown-блоки в ответе ассистента", async (): Promise<void> => {
        const user = userEvent.setup()
        const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

        renderWithProviders(
            <ChatPanel
                isOpen
                messages={messageList}
                onSendMessage={vi.fn()}
            />,
        )

        expect(screen.queryByText("Система")).not.toBeNull()
        expect(screen.getByLabelText("Code block code-0")).not.toBeNull()
        const docsLink = screen.getByRole("link", { name: "Docs" })
        expect(docsLink).toHaveAttribute("href", "/settings")

        await user.click(docsLink)
        expect(openSpy).toHaveBeenCalledWith("/settings", "_blank", "noopener,noreferrer")

        openSpy.mockRestore()
    })

    it("рендерит индикатор активного контекста и меняет его", async (): Promise<void> => {
        const user = userEvent.setup()
        const onContextChange = vi.fn()

        renderWithProviders(
            <ChatPanel
                contextItems={chatContextItems}
                isOpen
                messages={messageList}
                onContextChange={onContextChange}
                activeContextId="context-alpha"
                onSendMessage={vi.fn()}
            />,
        )

        expect(screen.getByText("Current context")).not.toBeNull()
        expect(screen.getAllByText("repo-alpha — CCR #1201").length).toBeGreaterThan(0)

        await user.click(screen.getByRole("button", { name: "Change context" }))
        await user.click(screen.getByRole("option", { name: "Change context to repo-beta — CCR #1202" }))

        expect(onContextChange).toHaveBeenCalledTimes(1)
        expect(onContextChange).toHaveBeenCalledWith("context-beta")
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

    it("рендерит стриминг-ответ с индикатором и активной кнопкой Cancel", (): void => {
        const onCancelStreaming = vi.fn()
        renderWithProviders(
            <ChatPanel
                isOpen
                isStreaming
                messages={messageList}
                onCancelStreaming={onCancelStreaming}
                onSendMessage={vi.fn()}
                streamTokens={["Hello", ", ", "world"]}
                streamingTokenDelayMs={10}
            />,
        )

        expect(screen.getByText("AI пишет…")).not.toBeNull()
        const cancelButton = screen.getByRole("button", { name: "Cancel" })
        expect(cancelButton).not.toBeDisabled()

        fireEvent.click(cancelButton)
        expect(onCancelStreaming).toHaveBeenCalledTimes(1)
    })

    it("проксирует клики и hover code-reference из сообщений вверх через чат панель", async (): Promise<void> => {
        const user = userEvent.setup()
        const onCodeReferenceClick = vi.fn()
        const onCodeReferencePreview = vi.fn()
        const messagesWithCodeReference: ReadonlyArray<IChatPanelMessage> = [
            {
                content: "Проверь [src/index.ts:7](src/index.ts:7)",
                createdAt: "2026-03-03T10:03:00.000Z",
                id: "msg-ref",
                role: "assistant",
                sender: "AI",
            },
        ]

        renderWithProviders(
            <ChatPanel
                isOpen
                messages={messagesWithCodeReference}
                onCodeReferenceClick={onCodeReferenceClick}
                onCodeReferencePreview={onCodeReferencePreview}
                onSendMessage={vi.fn()}
            />,
        )

        const referenceLink = screen.getByRole("link", {
            name: "Code reference src/index.ts:7",
        })
        await user.click(referenceLink)
        expect(onCodeReferenceClick).toHaveBeenCalledTimes(1)
        expect(onCodeReferenceClick).toHaveBeenCalledWith({
            filePath: "src/index.ts",
            lineStart: 7,
            lineEnd: undefined,
        })

        await user.hover(referenceLink)
        expect(onCodeReferencePreview.mock.calls.length).toBeGreaterThan(0)
        expect(onCodeReferencePreview).toHaveBeenLastCalledWith({
            filePath: "src/index.ts",
            lineStart: 7,
            lineEnd: undefined,
        })
    })
})
