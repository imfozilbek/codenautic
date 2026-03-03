import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChatMessageBubble } from "@/components/chat/chat-message-bubble"
import type { IChatPanelMessage } from "@/components/chat/chat-panel"
import { renderWithProviders } from "../utils/render"

const messageWithCode: IChatPanelMessage = {
    content: "```ts\nconst ok = true\nreturn ok\n```\nКодовый пример",
    id: "msg-with-code",
    role: "assistant",
    sender: "Bot",
}

const messageWithMarkdown: IChatPanelMessage = {
    content: "### Заголовок\n- элемент списка\n[Docs](/docs)\nИнлайн `код`.",
    id: "msg-with-markdown",
    role: "assistant",
    sender: "Bot",
}

function mockClipboard(): void {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
            writeText,
        },
    })
}

beforeEach((): void => {
    vi.restoreAllMocks()
    mockClipboard()
})

describe("chat message bubble", (): void => {
    it("рендерит сообщение пользователя и ассистента с меткой времени", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                message={{
                    ...messageWithMarkdown,
                    id: "user-msg",
                    role: "user",
                    sender: "Alice",
                }}
            />,
        )

        expect(screen.queryByText("Alice")).not.toBeNull()
        expect(screen.queryByText("—")).not.toBeNull()
    })

    it("копирует содержимое сообщения целиком", async (): Promise<void> => {
        const user = userEvent.setup()
        const message = messageWithCode
        renderWithProviders(
            <ChatMessageBubble
                message={message}
            />,
        )

        const copyMessageButton = screen.getByRole("button", {
            name: `Copy message ${message.sender}`,
        })
        await user.click(copyMessageButton)

        const clipboardMock = navigator.clipboard.writeText
        expect(clipboardMock).toHaveBeenCalledTimes(1)
        expect(clipboardMock).toHaveBeenCalledWith(message.content)
    })

    it("поддерживает копирование и разворачивание блока кода", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <ChatMessageBubble
                message={messageWithCode}
            />,
        )

        const copyCodeButton = screen.getByRole("button", {
            name: "Copy code block code-0",
        })
        await user.click(copyCodeButton)

        const expandCodeButton = screen.getByRole("button", {
            name: "Expand code block code-0",
        })
        const codeContainer = screen.getByText("const ok = true").closest("pre")
        expect(codeContainer).not.toBeNull()
        expect(codeContainer === null ? false : codeContainer.className.includes("max-h-36")).toBe(
            true,
        )

        await user.click(expandCodeButton)
        expect(expandCodeButton).toHaveAttribute("aria-expanded", "true")
        expect(codeContainer === null ? false : codeContainer.className.includes("max-h-none")).toBe(
            true,
        )

        const clipboardMock = navigator.clipboard.writeText
        expect(clipboardMock).toHaveBeenCalledTimes(1)
        expect(clipboardMock).toHaveBeenCalledWith("const ok = true\nreturn ok")
    })

    it("рендерит markdown: заголовок, списки, ссылку и inline-code", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                message={messageWithMarkdown}
            />,
        )

        expect(screen.getByRole("heading", { level: 5, name: "Заголовок" })).not.toBeNull()
        expect(screen.getByRole("list")).not.toBeNull()
        expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs")
        expect(screen.queryByText("код")).not.toBeNull()
    })

    it("вызывает callbacks по клику и наведению кода-ссылок", async (): Promise<void> => {
        const user = userEvent.setup()
        const onCodeReferenceClick = vi.fn()
        const onCodeReferencePreview = vi.fn()

        renderWithProviders(
            <ChatMessageBubble
                message={{
                    ...messageWithMarkdown,
                    content: "[src/index.ts:10](src/index.ts:10)",
                    id: "msg-ref",
                    role: "assistant",
                }}
                onCodeReferenceClick={onCodeReferenceClick}
                onCodeReferencePreview={onCodeReferencePreview}
            />,
        )

        const referenceLink = screen.getByRole("link", {
            name: "Code reference src/index.ts:10",
        })
        await user.click(referenceLink)
        expect(onCodeReferenceClick).toHaveBeenCalledTimes(1)
        expect(onCodeReferenceClick).toHaveBeenCalledWith({
            filePath: "src/index.ts",
            lineStart: 10,
            lineEnd: undefined,
        })

        await user.hover(referenceLink)
        expect(onCodeReferencePreview).toHaveBeenCalledTimes(1)
        expect(onCodeReferencePreview).toHaveBeenCalledWith({
            filePath: "src/index.ts",
            lineStart: 10,
            lineEnd: undefined,
        })
    })
})
