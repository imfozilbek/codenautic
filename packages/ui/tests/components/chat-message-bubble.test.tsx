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
        renderWithProviders(<ChatMessageBubble message={message} />)

        const copyMessageButton = screen.getByRole("button", {
            name: `Copy message ${message.sender}`,
        })
        await user.click(copyMessageButton)
        expect(copyMessageButton).not.toBeNull()
    })

    it("поддерживает копирование и разворачивание блока кода", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ChatMessageBubble message={messageWithCode} />)

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
        renderWithProviders(<ChatMessageBubble message={messageWithMarkdown} />)

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
        const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

        try {
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
            expect(openSpy).toHaveBeenCalledWith("/docs", "_blank", "noopener,noreferrer")
        } finally {
            openSpy.mockRestore()
        }
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
        await user.click(
            screen.getByRole("link", { name: "Code reference C:\\repo\\src\\index.ts:22" }),
        )

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

    it("when роль system, then отображает метку Система", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "Системное уведомление",
                    id: "sys-msg",
                    role: "system",
                }}
            />,
        )

        expect(screen.queryByText("Система")).not.toBeNull()
    })

    it("when контент пустой, then отображает dash в области контента", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "",
                    id: "empty-msg",
                    role: "assistant",
                    sender: "Bot",
                }}
            />,
        )

        const dashes = screen.queryAllByText("—")
        expect(dashes.length).toBeGreaterThanOrEqual(2)
        const contentDash = dashes.find((element): boolean =>
            element.className.includes("text-text-subtle"),
        )
        expect(contentDash).not.toBeUndefined()
    })

    it("when compact true, then применяет full width", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                compact
                message={{
                    content: "Compact message",
                    id: "compact-msg",
                    role: "user",
                    sender: "User",
                }}
            />,
        )

        const article = screen.getByRole("article")
        expect(article.className).toContain("max-w-full")
    })

    it("when compact false, then применяет ограниченный width", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "Normal message",
                    id: "normal-msg",
                    role: "user",
                    sender: "User",
                }}
            />,
        )

        const article = screen.getByRole("article")
        expect(article.className).toContain("max-w-[82%]")
    })

    it("when createdAt валидная строка, then отображает форматированное время", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "Timed message",
                    createdAt: new Date("2026-03-10T14:30:00.000Z"),
                    id: "timed-msg",
                    role: "assistant",
                    sender: "Bot",
                }}
            />,
        )

        expect(screen.queryByText("—")).toBeNull()
    })

    it("when createdAt невалидная строка, then отображает dash", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "Bad date message",
                    createdAt: "not-a-date",
                    id: "bad-date-msg",
                    role: "assistant",
                    sender: "Bot",
                }}
            />,
        )

        expect(screen.queryByText("—")).not.toBeNull()
    })

    it("when sender не задан, then использует role-based label", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "No sender",
                    id: "no-sender-msg",
                    role: "assistant",
                }}
            />,
        )

        expect(screen.queryByText("Ассистент")).not.toBeNull()
    })

    it("when ссылка содержит URL с протоколом, then не парсит как code reference", (): void => {
        const onCodeReferenceClick = vi.fn()

        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "[Docs](https://docs.example.com/guide)",
                    id: "url-link-msg",
                    role: "assistant",
                    sender: "Bot",
                }}
                onCodeReferenceClick={onCodeReferenceClick}
            />,
        )

        const link = screen.getByRole("link", { name: "Docs" })
        expect(link).toHaveAttribute("href", "https://docs.example.com/guide")
    })

    it("when code block без языка, then отображает text", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "```\nplain text block\n```",
                    id: "no-lang-msg",
                    role: "assistant",
                    sender: "Bot",
                }}
            />,
        )

        const codeBlock = screen.getByLabelText("Code block code-0")
        expect(codeBlock).not.toBeNull()
        expect(screen.queryByText("text")).not.toBeNull()
    })

    it("when markdown содержит h2, then рендерит как h4", (): void => {
        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "## Подзаголовок",
                    id: "h2-msg",
                    role: "assistant",
                    sender: "Bot",
                }}
            />,
        )

        expect(screen.getByRole("heading", { level: 4, name: "Подзаголовок" })).not.toBeNull()
    })

    it("when code reference с line range (start-end), then парсит оба числа", async (): Promise<void> => {
        const user = userEvent.setup()
        const onCodeReferenceClick = vi.fn()

        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "[src/utils.ts:5-15](src/utils.ts:5-15)",
                    id: "range-ref-msg",
                    role: "assistant",
                }}
                onCodeReferenceClick={onCodeReferenceClick}
            />,
        )

        const link = screen.getByRole("link", {
            name: "Code reference src/utils.ts:5-15",
        })
        await user.click(link)

        expect(onCodeReferenceClick).toHaveBeenCalledWith({
            filePath: "src/utils.ts",
            lineStart: 5,
            lineEnd: 15,
        })
    })

    it("when code reference с hash range #L10-L20, then парсит hash line numbers", async (): Promise<void> => {
        const user = userEvent.setup()
        const onCodeReferenceClick = vi.fn()

        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "[src/app.ts#L10-L20](src/app.ts#L10-L20)",
                    id: "hash-range-msg",
                    role: "assistant",
                }}
                onCodeReferenceClick={onCodeReferenceClick}
            />,
        )

        const link = screen.getByRole("link", {
            name: "Code reference src/app.ts:10-20",
        })
        await user.click(link)

        expect(onCodeReferenceClick).toHaveBeenCalledWith({
            filePath: "src/app.ts",
            lineStart: 10,
            lineEnd: 20,
        })
    })

    it("when onCodeReferenceClick не передан но href содержит code ref, then ссылка не делает preventDefault", async (): Promise<void> => {
        renderWithProviders(
            <ChatMessageBubble
                message={{
                    content: "[src/main.ts:5](src/main.ts:5)",
                    id: "no-callback-msg",
                    role: "assistant",
                }}
            />,
        )

        const link = screen.getByRole("link", {
            name: "Code reference src/main.ts:5",
        })
        expect(link).not.toBeNull()
    })
})
