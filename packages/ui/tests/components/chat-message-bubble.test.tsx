import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

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
        expect(copyMessageButton).not.toBeNull()
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
        const codeBlock = screen.getByLabelText("Code block code-0")
        const codeContainer = codeBlock.querySelector("pre")
        expect(codeContainer).not.toBeNull()
        expect(codeContainer === null ? false : codeContainer.className.includes("max-h-36")).toBe(
            true,
        )

        await user.click(expandCodeButton)
        expect(screen.getByRole("button", { name: "Collapse code block code-0" })).not.toBeNull()
        const expandedCodeBlock = screen.getByLabelText("Code block code-0")
        const expandedCodeContainer = expandedCodeBlock.querySelector("pre")
        expect(
            expandedCodeContainer === null
                ? false
                : expandedCodeContainer.className.includes("max-h-none"),
        ).toBe(true)
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
        expect(onCodeReferencePreview.mock.calls.length).toBeGreaterThan(0)
        expect(onCodeReferencePreview).toHaveBeenLastCalledWith({
            filePath: "src/index.ts",
            lineStart: 10,
            lineEnd: undefined,
        })
    })

    it("не обрабатывает route-ссылку как code-reference даже при переданных callbacks", async (): Promise<void> => {
        const user = userEvent.setup()
        const onCodeReferenceClick = vi.fn()
        const onCodeReferencePreview = vi.fn()

        renderWithProviders(
            <ChatMessageBubble
                message={messageWithMarkdown}
                onCodeReferenceClick={onCodeReferenceClick}
                onCodeReferencePreview={onCodeReferencePreview}
            />,
        )

        const docsLink = screen.getByRole("link", { name: "Docs" })
        expect(docsLink).toHaveAttribute("href", "/docs")
        expect(screen.queryByRole("link", { name: /Code reference \/docs/i })).toBeNull()

        await user.click(docsLink)
        await user.hover(docsLink)
        expect(onCodeReferenceClick).not.toHaveBeenCalled()
        expect(onCodeReferencePreview).not.toHaveBeenCalled()
    })

    it("парсит code references с форматом line:column и hash line+column", async (): Promise<void> => {
        const user = userEvent.setup()
        const onCodeReferenceClick = vi.fn()

        renderWithProviders(
            <ChatMessageBubble
                message={{
                    ...messageWithMarkdown,
                    content:
                        "[src/index.ts:12:4](src/index.ts:12:4) [src/app.ts#L8C2](src/app.ts#L8C2) [/tmp/src/main.ts:15:2](/tmp/src/main.ts:15:2) [src/Dockerfile:9](src/Dockerfile:9) [C:\\repo\\src\\index.ts:22](C:\\repo\\src\\index.ts:22)",
                    id: "msg-ref-columns",
                    role: "assistant",
                }}
                onCodeReferenceClick={onCodeReferenceClick}
            />,
        )

        await user.click(screen.getByRole("link", { name: "Code reference src/index.ts:12" }))
        await user.click(screen.getByRole("link", { name: "Code reference src/app.ts:8" }))
        await user.click(screen.getByRole("link", { name: "Code reference /tmp/src/main.ts:15" }))
        await user.click(screen.getByRole("link", { name: "Code reference src/Dockerfile:9" }))
        await user.click(screen.getByRole("link", { name: "Code reference C:\\repo\\src\\index.ts:22" }))

        expect(onCodeReferenceClick).toHaveBeenNthCalledWith(1, {
            filePath: "src/index.ts",
            lineStart: 12,
            lineEnd: undefined,
        })
        expect(onCodeReferenceClick).toHaveBeenNthCalledWith(2, {
            filePath: "src/app.ts",
            lineStart: 8,
            lineEnd: undefined,
        })
        expect(onCodeReferenceClick).toHaveBeenNthCalledWith(3, {
            filePath: "/tmp/src/main.ts",
            lineStart: 15,
            lineEnd: undefined,
        })
        expect(onCodeReferenceClick).toHaveBeenNthCalledWith(4, {
            filePath: "src/Dockerfile",
            lineStart: 9,
            lineEnd: undefined,
        })
        expect(onCodeReferenceClick).toHaveBeenNthCalledWith(5, {
            filePath: "C:\\repo\\src\\index.ts",
            lineStart: 22,
            lineEnd: undefined,
        })
    })
})
